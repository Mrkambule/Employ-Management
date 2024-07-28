const express = require("express");
const path = require("path");
const mysql = require("mysql");
const session = require('express-session');
const hbs = require('hbs');
const hbsHelpers = require('./hbs-helpers');
const dotenv = require("dotenv");

dotenv.config({ path: './.env' });

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 300000 } // Session expires in 5 minutes
}));

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Register Handlebars helpers
hbs.registerHelper('ifEquals', hbsHelpers.ifEquals);

app.use(express.static(path.join(__dirname, 'public')));
// Set the view engine to hbs
app.set('view engine', 'hbs');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

db.connect((error) => {
    if (error) {
        console.log(error);
    } else {
        console.log("MySQL connected!");
    }
});

// Middleware to set message in response locals
app.use((req, res, next) => {
    res.locals.message = req.session.message;
    res.locals.tasks = req.session.tasks;
    res.locals.messageType = req.session.messageType;
    res.locals.user = req.session.user; // Pass user data to response locals
    delete req.session.message;
    delete req.session.messageType;
    next();
});

// Fetch user data and tasks
app.get('/api/user-data', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.session.user.id;
    db.query('SELECT task_title, task_description FROM assigned_task WHERE user_id = ?', [userId], (err, assignedTasks) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Failed to fetch tasks' });
        }

        res.json({
            user: req.session.user,
            tasks: assignedTasks.map(task => ({
                title: task.task_title,
                description: task.task_description
            }))
        });
    });
});



app.post('/task/action', (req, res) => {
    if (!req.session.user) {
        req.session.message = 'Please log in to perform this action!';
        req.session.messageType = 'error';
        return res.redirect('/auth/login');
    }

    const { action, taskId } = req.body;
    const userId = req.session.user.id;

    console.log('Action:', action);
    console.log('Task ID:', taskId);
    console.log('User ID:', userId);

    // Validate taskId
    if (!taskId || isNaN(taskId)) {
        req.session.message = 'Invalid Task ID!';
        req.session.messageType = 'error';
        return res.redirect('/home');
    }

    if (action === 'accept') {
        db.query('UPDATE assigned_task SET status = ? WHERE task_id = ? AND user_id = ?', ['In Progress', taskId, userId], (error, results) => {
            if (error) {
                console.log('Error:', error);
                req.session.message = 'Failed to accept the task!';
                req.session.messageType = 'error';
                return res.redirect('/home');
            } else {
                console.log('Results:', results);
                req.session.message = 'Task accepted successfully!';
                req.session.messageType = 'success';
                return res.redirect('/home');
            }
        });
    } else if (action === 'done') {
        db.query('SELECT status FROM assigned_task WHERE task_id = ? AND user_id = ?', [taskId, userId], (error, results) => {
            if (error) {
                console.log('Error:', error);
                req.session.message = 'Failed to check task status!';
                req.session.messageType = 'error';
                return res.redirect('/home');
            } else if (results.length === 0) {
                req.session.message = 'Task not found!';
                req.session.messageType = 'error';
                return res.redirect('/home');
            } else {
                const status = results[0].status;
                console.log('Current Status:', status);
                if (status === 'Not Accepted') {
                    req.session.message = 'Accept the task first!';
                    req.session.messageType = 'error';
                    return res.redirect('/home');
                } else {
                    db.query('UPDATE assigned_task SET status = ? WHERE task_id = ? AND user_id = ?', ['Completed', taskId, userId], (error, results) => {
                        if (error) {
                            console.log('Error:', error);
                            req.session.message = 'Failed to mark the task as done!';
                            req.session.messageType = 'error';
                            return res.redirect('/home');
                        } else {
                            console.log('Results:', results);
                            req.session.message = 'Task marked as done successfully!';
                            req.session.messageType = 'success';
                            return res.redirect('/home');
                        }
                    });
                }
            }
        });
    } else {
        req.session.message = 'Invalid action!';
        req.session.messageType = 'error';
        return res.redirect('/home');
    }
});




// Admin routes

// Routes
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

app.get('/home', authMiddleware, (req, res) => {
    res.render('home', { user: req.session.user }); // Render the home page with user data
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/');
    });
});

app.listen(5000, () => {
    console.log("Server started on port 5000");
});