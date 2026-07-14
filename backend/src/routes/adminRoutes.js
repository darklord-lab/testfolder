const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Teacher routes
router.get('/teachers', adminController.getAllTeachers);
router.post('/teachers', adminController.addTeacher);
router.delete('/teachers/:id', adminController.deleteTeacher);

// Student routes
router.get('/students', adminController.getAllStudents);
router.post('/students', adminController.addStudent);
router.delete('/students/:id', adminController.deleteStudent);

// Question Bank Management
router.get('/chapter-sets', adminController.getChapterSets);
router.delete('/chapter-sets', adminController.deleteChapterSet);

module.exports = router;
