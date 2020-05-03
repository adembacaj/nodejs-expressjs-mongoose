const User = require('./user.model');
const httpStatus = require('http-status');
const APIError = require('../helpers/APIError');
const sha256 = require('crypto-js/sha256');
const fs = require('fs');
const config = require('../../config/config');

function create(req, res, next) {
  const PASSWORD_SALT = 'palidhje123';

  const userModel = new User({
    email: req.body.email.toLowerCase(),
    password: sha256(PASSWORD_SALT + req.body.password),
    name: req.body.name,
    surname: req.body.surname,
    birthdate: req.body.birthdate,
    gender: req.body.gender,
    city: req.body.city,
    profile_picture: req.body.profile_picture,
  });

  User.find({
    $or: [
      { email: req.body.email.toLowerCase() },
      { email: { "$ne": req.body.email.toLowerCase() } }
    ]
  }).lean().exec().then((user) => {
    if (user.length > 0) {
      res.json({
        success: false,
        message: "Përdoruesi me email apo numër leternjoftimi të njëjtë ekziston."
      })
    } else {
      userModel.save()
        .then((savedUser) => {
          res.json({ success: true, data: savedUser })
        })
        .catch(e => {
          const err = new APIError(e.message, httpStatus.METHOD_NOT_ALLOWED, true);
          next(err);
        });
    }
  })

}

function getOne(req, res, next) {
  User.findOne({ _id: req.params.userId })
    .select('_id email name surname city birthdate gender profile_picture').lean().exec().then((data) => {
      if (data) res.json({ success: true, data });
      else res.json({ success: false, data: "Nuk keni te drejte te shikoni kete profil" });
    }).catch(e => {
      const err = new APIError(e.message, httpStatus.METHOD_NOT_ALLOWED, true);
      next(err);
    })
}

function update(req, res, next) {
  User.findOne({ _id: req.params.userId }).exec().then((data) => {
    data.name = req.body.name
    data.surname = req.body.surname
    data.city = req.body.city
    data.birthdate = req.body.birthdate
    data.gender = req.body.gender
    data.save().then(savedUser => {
      res.json({ success: true, data: savedUser })
    }).catch(e => {
      res.json({ success: false, message: "Unable to update the department data." })
    })
  }).catch(e => {
    const err = new APIError(e.message, httpStatus.METHOD_NOT_ALLOWED, true);
    next(err);
  })
}

function deleteOne(req, res, next) {
  User.findOneAndRemove({ _id: req.params.userId }).then((data) => {
    if (data) res.json({ success: true, message: "Të dhënat u fshinë me sukses." });
    else res.json({ success: false, message: "Rekordi nuk ekzistion." });
  }).catch(e => {
    const err = new APIError(e.message, httpStatus.METHOD_NOT_ALLOWED, true);
    next(err);
  })
}

function uploadProfilePicture(req, res, next) {
  User.findOne({ _id: req.params.userId }).then(async (data) => {
    if (!data) return res.json({ success: false, message: "User record not found" });
    const files = req.files;
    const file = files['file'];

    const filename = `${req.params.userId}${file.name}`
    fs.writeFile(`${config.basePath}/public/profile/${filename}`, file.data, function (err) {
      if (err) return res.json({ success: false, message: "Failed to write the picture." });

      var photo = `${config.domain}/public/profile/${filename}`
      User.findOneAndUpdate({ _id: req.params.userId }, { $set: { profile_picture: photo } }, { new: true }).select("_id profile_picture").then(savedUser => {
        res.json({ success: true, data: savedUser })
      }).catch(e => {
        console.log("err", e)
        res.json({ success: false, message: "Failed to update the record." })
      })
    });
  }).catch(e => {
    const err = new APIError(e.message, httpStatus.METHOD_NOT_ALLOWED, true);
    next(err);
  })
}


module.exports = { create, getOne, update, deleteOne, uploadProfilePicture }