import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    const {username, fullname, email, password} = req.body;
    console.log("email ", email)

    // validation - not empty
    if([username, fullname, email, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required!")
    }

    // check if user already exists : username, email
    const existingUser = User.findOne({
        $or: [{username}, {email}]
    })
    if(existingUser){
        throw new ApiError(409, "User with this credentials already exists!")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required!")
    }

    // upload files on cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    // create user object - create entry in database
    const user = await User.create({
        fullname,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password
    })

    // remove password and refresh token from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken") 

    // check for user creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user!")
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    )

} )

export {registerUser}