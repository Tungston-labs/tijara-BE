const mongoose=require('mongoose')

const connectDb= async ()=>{

    try {
        await mongoose.connect(process.env.DATABASE_URI);
        console.log("mongoDB connected");
        console.log("Connecting to MongoDB URI:", process.env.DATABASE_URI);

    } catch (error) {
        console.log(error.message)        
    }
}
module.exports=connectDb;