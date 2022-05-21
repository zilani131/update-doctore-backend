const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const res = require('express/lib/response');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express()
const port = process.env.PORT||5000;
app.use(cors());
app.use(express.json());
// username:doctor_admin
// password:pWQKQN4z0PRUOdpP

// const collection = client.db("test").collection("devices");
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.miuys.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.miuys.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// should be declare out side the async function
function verifyJWT(req,res,next){
  const authHeader=req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message:"unauthorized access"})
  }
  const token=authHeader.split(' ')[1]; //taking the token from authheader,where headers.authorization = headers:{'authorization':`Bearer ${localStorage.getItem('accessToken')}`,
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,function(err,decoded){
  if(err){
    return res.status(403).send({message:"Forbidden Access"})
  }
  req.decoded=decoded;
  next();
  })
}


async function run(){
try{
 await client.connect();
const serviceCollection=client.db("doctors_portal").collection("sevices");
const bookingCollection=client.db("doctors_portal").collection("booking");
const userCollection=client.db("doctors_portal").collection("users");
app.get('/service',async (req,res)=>{
    const query={};
    const cursor=serviceCollection.find(query);
    const services =await cursor.toArray();
    res.send(services);
})
// updating the time slot
app.get('/available',async(req,res)=>{
  
  const date =req.query.date|| 'May 20, 2022';
  const services= await serviceCollection.find().toArray();
  const bookings=await bookingCollection.find({date:date}).toArray();
  console.log('bookings',bookings);
  services.forEach(service=>{
     const bookingServices=bookings.filter(booked=>booked.treatment===service.name);
     const bookeds=bookingServices.map(booked=>booked.slot)
     console.log("bookingServices",bookingServices);
     console.log("slot",bookeds);
     const availableSlots=service.slots.filter(slot=>!bookeds.includes(slot));
    service.slots=availableSlots;

  })
  res.send(services);

})
// geting the booking by email
app.get('/booking',verifyJWT,async(req,res)=>{
  const email =req.query.email;
  // const authorization=req.headers.authorization; we declare it above in function and set the function as middleware name verifyJWT
  const decodedEmail=req.decoded.email;
  if(email===decodedEmail){
    // console.log('auth header',authorization);
  const query={patientEmail:email}
  const bookings=await bookingCollection.find(query).toArray();
  res.send(bookings);
  }
  else{
    return res.status(403).send({message:"forbidden Access"})
  }
})
// get all users
app.get('/users',verifyJWT,async(req,res)=>{
  const users=await userCollection.find().toArray();
  res.send(users);

})
// find admin
app.get('/admin/:email',verifyJWT,async(req,res)=>{
  const email=req.params.email;
  const user =await userCollection.findOne({email:email})
  const isAdmin=user.role==='admin';
  res.send({admin:isAdmin})
}

)
// making admin role
app.put('/user/admin/:email',verifyJWT,async(req,res)=>{
  const email=req.params.email;
  const requesterEmail=req.decoded.email;
  const requesterAccount=await userCollection.findOne({email:requesterEmail}) //checking the one who logged in is admin or not 
  if(requesterAccount.role==='admin')
{
  const filter={email:email};

  const updateDoc={
    $set:{role:"admin"},
  };
  const result=await userCollection.updateOne(filter,updateDoc);
  
  res.send(result);
}
else{
  res.status(403).send({message:"forbidden"})
}
})
// upsert method and creating to get is the user already inserted
app.put('/user/:email',async(req,res)=>{
  const email=req.params.email;
  const user=req.body;
  const filter={email:email};
  const options={upsert:true}; 
  const updateDoc={
    $set:user,
  };
  const result=await userCollection.updateOne(filter,updateDoc,options);
  const token=jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'30d'})
  res.send({result,token});
})
// booking post 
app.post('/booking',async(req,res)=>{
  const booking=req.body;
  console.log(booking);
  const query={treatment:booking.treatment,date:booking.date, patientName:booking.patientName}
  console.log(query)
  const exists=await bookingCollection.findOne(query);
  if(exists){
    return res.send({success:false,booking:exists})
    // if exists then it will give false in success and return
  }
  const result= await bookingCollection.insertOne(booking);
  return res.send({success:true,result})
})
}
finally{

}
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('hello from doctor uncle!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
/*
 
  const availableServices=await serviceCollection.find().toArray();
  console.log(availableServices)
  const query={date:date};
  const bookings=await bookingCollection.find(query).toArray();
  console.log('booking',bookings)
  availableServices.forEach(service=>{
    console.log('service',service,service.name,bookings)
    const serviceBookings=bookings.filter(b=>b.treatment==service.name)
    const booked=serviceBookings.map(s=>s.slot);
    // // service.booked=booked
    // service.booked=serviceBookings.map(s=>s.slot);
    const available=service.slots.filter(s=>!booked.includes(s));
    service.slots=available; //creating a new object key and assigning its value;
  })
  res.send(availableServices);
*/ 