import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// method to generate access and refresh token
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { username, fullname, email, password } = req.body;
  //   console.log("email ", email);

  // validation - not empty
  if (
    [username, fullname, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  // check if user already exists : username, email
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User with this credentials already exists!");
  }

  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // upload files on cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(401, "Avatar upload on cloudinary failed");
  }

  // create user object - create entry in database
  const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
  });

  // remove password and refresh token from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user!");
  }

  // return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // taking data from req.body
  const { username, email, password } = req.body;

  // username or email authentication
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  // find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  console.log("PLAIN:", password);
  console.log("HASH:", user?.password);

  // password check
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials!");
  }

  // access and generate refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully."
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: req.user,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // finding user
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // comparing tokens
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // generating new tokens
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
});
export { registerUser, loginUser, logoutUser, refreshAccessToken };
