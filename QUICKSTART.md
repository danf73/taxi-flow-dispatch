# 🚀 Quick Start Guide

## Getting Started in 3 Steps

### 1️⃣ Start the Server
```bash
npm start
```
Server runs on http://localhost:3000

### 2️⃣ Open Reception Dashboard
Go to: **http://localhost:3000**

**Create your first job:**
- Enter customer name and phone
- Select vehicle type (Sedan, SUV, Van, etc.)
- Choose payment method
- Click the map to set pickup (blue marker)
- Click again to set dropoff (red marker)
- Price calculates automatically
- Click "Create Job"

### 3️⃣ Open Driver App (New Tab)
Go to: **http://localhost:3000/driver**

**Accept a job:**
- Select a driver from dropdown
- Click "Start Shift"
- See available jobs appear
- Click "Accept" on a job
- Update status: Arrived → Picked Up → Complete
- Rate the trip

---

## 📊 View Analytics
Go to: **http://localhost:3000/analytics**
- See revenue stats
- Monitor driver performance
- View charts and metrics

---

## 🎯 Key Features at a Glance

### Reception Features
✅ Customer database with auto-complete
✅ 5 vehicle types with dynamic pricing
✅ 4 payment methods (Cash, Card, Account, App)
✅ Real-time job tracking
✅ Job history with search
✅ Live driver monitoring

### Driver Features
✅ Shift management (start/end shift)
✅ Real-time earnings tracker
✅ Step-by-step job workflow
✅ Interactive map navigation
✅ Rating system
✅ Accept/decline jobs

### Analytics Features
✅ Revenue tracking (today/week/month)
✅ Driver performance metrics
✅ Job status distribution
✅ Visual charts
✅ Fleet overview

---

## 💰 Pricing Explained

**Base calculation:**
$5.00 (base) + ($2.50 × distance km)

**Then multiplied by:**
- Vehicle type (Sedan 1x, SUV 1.4x, Van 1.6x, Luxury 2x)
- Time surge (Rush hour 1.5x, Night 1.3x)
- Weather surge (1.0x - 1.4x)

**Example:**
10km trip in SUV during rush hour:
- $5 + ($2.50 × 10) = $30
- $30 × 1.4 (SUV) × 1.5 (rush hour) = $63.00

---

## 🔄 Complete Job Workflow

**Reception → Driver → Customer → Complete**

1. **Reception creates job** → Job pending
2. **Driver accepts** → Status: Accepted
3. **Driver arrives** → Status: Arrived
4. **Customer gets in** → Status: Picked Up
5. **Driver completes** → Status: Completed
6. **Job moves to history** → Driver earns money

---

## 🎓 Best Practices

### For Dispatchers:
- Keep driver shift status updated
- Monitor active jobs regularly
- Use customer autocomplete for regulars
- Check analytics daily

### For Drivers:
- Start shift before accepting jobs
- Update status promptly
- Rate trips accurately
- Keep app open for notifications

---

## 🆘 Quick Troubleshooting

**Driver can't see jobs?**
→ Click "Start Shift" button

**Jobs not updating?**
→ Check WebSocket connection (browser console)

**Map not showing?**
→ Check internet connection

**Wrong price calculation?**
→ Verify vehicle type and locations

---

## 📱 URLs to Bookmark

- Reception: http://localhost:3000
- Analytics: http://localhost:3000/analytics
- Driver: http://localhost:3000/driver

---

## 🌟 Pro Tips

1. Open Reception and Driver in **separate browser windows** side-by-side to see real-time updates
2. Use **Chrome DevTools** (F12) to see WebSocket messages
3. Click on map markers to see **job details**
4. Driver markers are **color-coded**: Green = Available, Red = Busy
5. Use the **History tab** to review past jobs

---

Need help? Check README.md for full documentation!
