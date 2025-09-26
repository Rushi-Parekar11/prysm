# Stock Portfolio Tracker Component for Prysm finance



## Objective

Build a small, polished frontend app that Accepts a CSV of stock trades Shows a portfolio summary, holdings table, and interactive charts ,Provides filters , search, sorting, and pagination

---

## Tech stack

* **React.js**
* **JavaScript**
* **Tailwind CSS**
* **Recharts**  for charts
* **Custom parsing** 

---

## Features implemented

1. **Upload & parse CSV** using custom parsing
2. **Aggregation & calculations**
3. **Portfolio Summary**
4. **Holdings Table**
5. **Interactive charts** 
6. **Filters**
8. **Error handling**

---

## CSV format (example)

Save this as `trades.csv` to test the app:

```
symbol,shares,price,date
AAPL,10,172.35,2024-06-12
TSLA,5,225.40,2024-06-13
AAPL,-3,180.00,2024-07-01
MSFT,4,320.5,2024-08-20
GOOG,2,140.0,2024-08-21
```

Notes:

* `shares` can be negative to indicate sells.
* `date` accepts `YYYY-MM-DD` format.

---




## Running locally

1. Clone the repo:

```bash
git clone https://github.com/Rushi-Parekar11/prysm
cd vite-project
```

2. Install dependencies:

```bash
npm install
```

3. Run dev server:

```bash
npm dev
```



---

## Deployment

Deploy the app to **Vercel** . 


---

