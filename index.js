const express = require('express'); 
const request = require('request');
const app = express();
const session=require("express-session");
const bp=require("body-parser");
const ejs=require("ejs");
const passwordHash=require("password-hash");
const axios=require("axios");
const port=3000;
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true
}));
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore} = require('firebase-admin/firestore');
var serviceAccount = require("./key.json");
 
initializeApp({
    credential: cert(serviceAccount)
  });
  
const db = getFirestore();

app.get('/', (req, res) => {
  res.render("signup.ejs",{errormessage:""});
});

app.get("/signupsubmit", function (req, res) {
    db.collection("usersDemo")
    .where("Email","==",req.query.email)
    .get()
    .then((docs)=>{
      if(docs.size>0){
     
        res.render("signup.ejs",{errormessage:"This account is already existed,Please login"})
      }
      else{
        db.collection("usersDemo")
      .add({
        FullName: req.query.fullname,
        Email: req.query.email,
        Password: passwordHash.generate(req.query.password),
      })
      .then(() => {
        res.render("login.ejs");
     });
    }
    })
});

app.get("/loginsubmit", function (req, res) {
    db.collection("usersDemo")
      .where("Email", "==", req.query.email)
      .get()
      .then((docs) => {
        let verified = false;
        docs.forEach((doc) => {
          // Set the authentication flag in the session
          verified = passwordHash.verify(req.query.password, doc.data().Password);
        });
          if(verified){
            req.session.authenticated = true;
            res.redirect("/dashboard");
          }
          else {
            res.send("login unsuccessful");
            }
    });
  });

  app.get("/login",function(req,res){
    res.render("login.ejs")
  })
/////
app.get("/dashboard",function(req,res){
    if(req.session.authenticated){
        res.render("dashboard",{Details: undefined, temp: undefined, weatherCondition: "" ,city:"",iconClass:""})
    }
    else{
        res.redirect('/login');
    }
});
app.post("/dashboard", async (req, res) => {
  const userInput = req.body.city;
  console.log(userInput)

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${userInput}&units=metric&appid=8bfbd007e26884674f75579904e09e64`
    );
   
   
    const data = response.data;
    const weather = data.weather[0].main;
    const weatherCondition = data.weather[0].main.toLowerCase();
    const temperature = data.main.temp;
    const city = data.name;
    const temp = temperature + "°c";

    //icons
    const weatherIcons = {
      '01d': 'fas fa-sun',       // Clear sky (day)
      '01n': 'fas fa-moon',     // Clear sky (night)
      '02d': 'fas fa-cloud-sun', // Few clouds (day)
      '02n': 'fas fa-cloud-moon', // Few clouds (night)
      '03d': 'fas fa-cloud',     // Scattered clouds
      '03n': 'fas fa-cloud',      
      '04n': 'fas fa-cloud',
      '09d': 'fas fa-cloud-showers-heavy', // Shower rain
      '09n': 'fas fa-cloud-showers-heavy',
      '10d': 'fas fa-cloud-rain', // Rain
      '10n': 'fas fa-cloud-rain',
      '50d': 'fas fa-smog',      // Mist
      '50n': 'fas fa-smog',
    };
    const icon=data.weather.icon;
    const iconCode = data.weather[0].icon;
    const iconClass = weatherIcons[iconCode] ;
    console.log(temp);
    console.log(icon);
    const message = `The weather in ${city} is ${weather} with a temperature of ${temperature.toFixed(2)}°C.`;

    console.log(message);
    res.render("dashboard.ejs", {
      Details: message,
      temp: temp,
      weatherCondition: weatherCondition,
      city:userInput,
      iconClass:iconClass
    });

   
  } catch (error) {
    console.log("City doesn't exist.");
    res.render("dashboard.ejs", { Details: "City doesn't exist." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});