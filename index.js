const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const port = process.env.PORT || 8000 ;


const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));


app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.onhj8vc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//availble times slots

const availableTimes = [
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
];

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    //DBcollections

    const reservationCollection = client.db('LittleLemon').collection('reservations')



    app.post('/reservation',async(req,res)=>{
        const {userId,email,phone,date,time,guest} =req.body;

        let bookinguserId;

        if(!userId){
            reservationUserId = uuidv4();
        }else{
            bookinguserId=userId
        }

        //create a new booking

        const newBooking={
            userId:bookinguserId,
            email,
            phone,
            date,
            time,
            guest,
            status:'pending'
        }
        const result = await reservationCollection.insertOne(newBooking)

        res.status(201).json({
            message:"Reservation was successfully created",
            bookingId:result.insertedId,
            userId:bookinguserId
        })

    })

    app.get('/available-slots', async (req, res) => {
        const today =dayjs()
        const twoWeeksLater = today.add(8,"week")

        //find  existing reservations for next 2 weeks

        const reservations = await reservationCollection.find({
            date:{
                $gte:today.format('YYYY-MM-DD'),
                $lte:twoWeeksLater.format('YYYY-MM-DD')
            }
        }).toArray()

        //generate all dates for next 2 weeks
        const availableDates = []
        for(let i=0; i<56; i++) {
            const date = today.add(i,'day').format('YYYY-MM-DD')
            const reservedSlots = reservations.filter(
                res => res.date === date
            ).map(res=>res.time)

            //check available slots
            const availableSlotsForDate = availableTimes.filter(
                time => !reservedSlots.includes(time))
            if  (availableSlotsForDate.length > 0 ) {
                availableDates.push({
                    date,
                    availableSlots: availableSlotsForDate
                })
            }
        }
        res.json(availableDates)

    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})