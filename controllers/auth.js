const mysql = require("mysql");
const bcrypt = require('bcryptjs');

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});


exports.register = (req, res) => {
    console.log(req.body);

    const { name, email, password, ConfirmPassword } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log(error);
        }
        if (results.length > 0) { // >0 means email already exist
            req.session.message = 'Email Already Exists!';
            req.session.messageType = 'error';
            return res.redirect('/register');
        } else if (password !== ConfirmPassword) {
            req.session.message = 'Passwords do not match!';
            req.session.messageType = 'error';
            return res.redirect('/register');
        } else {
            let hashedPassword = await bcrypt.hash(password, 8);
            console.log(hashedPassword);

            db.query('INSERT INTO users SET ?', { name: name, email: email, password: hashedPassword }, (error, results) => {
                if (error) {
                    console.log(error);
                    req.session.message = 'Registration failed!';
                    req.session.messageType = 'error';
                    return res.redirect('/register');
                } else {
                    req.session.message = 'User registered successfully!';
                    req.session.messageType = 'success';
                    return res.redirect('/register');
                }
            });
        }
    });
};
// admin register


// login auth
exports.login = (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log(error);
            return res.redirect('/login');
        }
        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
            req.session.message = 'Invalid email or password!';
            req.session.messageType = 'error';
            return res.redirect('/login');
        } else {
            const userId = results[0].id;
            req.session.user = {
                id: userId,
                name: results[0].name,
                email: results[0].email
            }; // Store user information in session

            // Fetch assigned tasks for the user
            db.query('SELECT task_title, task_description FROM assigned_task WHERE user_id = ?', [userId], (err, assignedTasks) => {
                if (err) {
                    console.log(err);
                    return res.redirect('/login');
                }

                if (assignedTasks.length > 0) {
                    // Store task titles and descriptions in session
                    req.session.tasks = assignedTasks.map(task => ({
                        title: task.task_title,
                        description: task.task_description
                    }));

                    req.session.message = 'Login successful!';
                    req.session.messageType = 'success';
                    return res.redirect('/login');
                } else {
                    req.session.tasks = [];
                    req.session.message = 'Login successful!';
                    req.session.messageType = 'success';
                    return res.redirect('/login');
                }
            });
        }
    });
};

// admin login

exports.adminLogin = (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log(error);
        }
        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
            req.session.message = 'Invalid email or password!';
            req.session.messageType = 'error';
            return res.redirect('/admin-login');
        } else {
            req.session.user = {
                id: results[0].id,
                name: results[0].name,
                email: results[0].email
            };
            req.session.message = 'Login successful!';
            req.session.messageType = 'success';
            return res.redirect('/admin-login');

        }
    });
};
// verify admin

exports.adminVerify = (req, res) => {
    const { code } = req.body;
    const email = req.session.user.email;

    db.query('SELECT * FROM verify WHERE code = ?', [code], (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send({ error: "Database query failed" });
        }
        if (results.length === 0) {
            req.session.message = 'Invalid admin code!';
            req.session.messageType = 'error';
            return res.redirect('/admin-verify');
        } else {
            // Verification successful, now fetch tasks and users
            const tasksQuery = 'SELECT * FROM task';
            const usersQuery = 'SELECT id, name FROM users';

            db.query(tasksQuery, (err, tasks) => {
                if (err) {
                    console.error("Error fetching tasks:", err);
                    res.status(500).send({ error: "Failed to fetch tasks" });
                } else {
                    db.query(usersQuery, (err, users) => {
                        if (err) {
                            console.error("Error fetching users:", err);
                            res.status(500).send({ error: "Failed to fetch users" });
                        } else {
                            // Pass tasks and users to the view
                            res.render('admin-home', {
                                message: 'Login successful!',
                                messageType: 'success',
                                tasks: tasks,
                                users: users
                            });
                        }
                    });
                }
            });
        }
    });
};
//

// user verification 


exports.userVerification = (req, res) => {
    const { code, staff_number } = req.body;

    db.query('SELECT * FROM employees WHERE id = ? AND staff_number = ?', [code, staff_number], (error, results) => {
        if (error) {
            console.log(error);
            req.session.message = 'Verification failed!';
            req.session.messageType = 'error';
            return res.redirect('/user-verification');
        }
        if (results.length > 0) {
            req.session.message = 'Verification successful!';
            req.session.messageType = 'success';
            return res.redirect('/user-verification');
        } else {
            req.session.message = 'You are not verified yet, please contact your administrator.';
            req.session.messageType = 'error';
            return res.redirect('/user-verification');
        }
    });
};

exports.createTask = (req, res) => {
    const { task_title, task_description, deadline_date } = req.body;
    const status = 'pending';  // Default status

    db.query('INSERT INTO tasks SET ?', { task_title, task_description, deadline_date, status }, (error, results) => {
        if (error) {
            console.log(error);
            return res.json({ success: false, message: 'Task creation failed!' });
        } else {
            return res.json({ success: true, message: 'Task created successfully!' });
        }
    });
};

exports.registerEmployee = (req, res) => {
    const { id_number, full_name, email, contact, address, position, department } = req.body;

    // Function to generate an 8-digit unique staff number
    const generateStaffNumber = () => {
        return Math.floor(10000000 + Math.random() * 90000000);
    };

    // Generate a unique 8-digit staff number
    let staff_number = generateStaffNumber();

    // Function to check if the generated staff number already exists
    const checkStaffNumberExists = (staff_number, callback) => {
        db.query('SELECT * FROM employees WHERE staff_number = ?', [staff_number], (error, results) => {
            if (error) {
                console.log(error);
                return res.json({ success: false, message: 'Database query failed!' });
            }
            callback(results.length > 0);
        });
    };

    // Recursive function to ensure unique staff number generation
    const ensureUniqueStaffNumber = (callback) => {
        checkStaffNumberExists(staff_number, (exists) => {
            if (exists) {
                staff_number = generateStaffNumber();
                ensureUniqueStaffNumber(callback);
            } else {
                callback();
            }
        });
    };

    // Check if id_number or email already exists
    db.query('SELECT * FROM employees WHERE id_number = ? OR email = ?', [id_number, email], (error, results) => {
        if (error) {
            console.log(error);
            return res.json({ success: false, message: 'Database query failed!' });
        }

        if (results.length > 0) {
            // id_number or email already exists
            return res.json({ success: false, message: 'Employee with the given ID number or email already exists!' });
        } else {
            // Ensure unique staff number before inserting new employee
            ensureUniqueStaffNumber(() => {
                const query = `
                    INSERT INTO employees (id_number, full_name, email, contact, address, position, department, staff_number) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;
                db.query(query, [id_number, full_name, email, contact, address, position, department, staff_number], (error, results) => {
                    if (error) {
                        console.log(error);
                        return res.json({ success: false, message: 'Employee registration failed!' });
                    } else {
                        return res.json({ success: true, message: 'Employee registered successfully!', staff_number });
                    }
                });
            });
        }
    });
};
