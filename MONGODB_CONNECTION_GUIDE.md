# MongoDB Connection Guide for GigLink

## Current Status

✅ **Local MongoDB**: Connected and working
- Database: `giglink`
- Collections: `users`, `profiles`, `gigs`, `messages`
- Data: 2 users, 2 profiles

❌ **MongoDB Atlas**: Connection blocked by IP whitelist
- Error: "Could not connect to any servers in your MongoDB Atlas cluster"
- Reason: Current IP address not whitelisted

## Database Configuration

### Current Connection String
```
mongodb+srv://oscarhuanxi_db_user:DwPibFAclkhKLkXK@cluster0.uh3xwth.mongodb.net/giglink?retryWrites=true&w=majority&appName=Cluster0
```

### Database Name
- **Correct**: `giglink` ✅
- The connection string properly specifies the `giglink` database

## How to Fix MongoDB Atlas Connection

### Step 1: Add Your IP to Atlas Whitelist

1. **Go to MongoDB Atlas Dashboard**
   - Visit: https://cloud.mongodb.com/
   - Log in with your credentials

2. **Navigate to Network Access**
   - Click on "Network Access" in the left sidebar
   - This shows your current IP whitelist

3. **Add Current IP Address**
   - Click "Add IP Address"
   - Select "Add Current IP Address" (recommended)
   - Or manually add your IP if needed
   - Add a description like "Development Machine"
   - Click "Confirm"

### Step 2: Alternative - Allow All IPs (Development Only)

⚠️ **Warning**: Only use this for development, never in production!

1. In Network Access, click "Add IP Address"
2. Select "Allow Access from Anywhere"
3. This adds `0.0.0.0/0` to allow all IPs
4. Click "Confirm"

### Step 3: Verify Connection

After updating the whitelist, test the connection:

```bash
# Test Atlas connection
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://oscarhuanxi_db_user:DwPibFAclkhKLkXK@cluster0.uh3xwth.mongodb.net/giglink?retryWrites=true&w=majority&appName=Cluster0').then(() => { console.log('✅ Connected to MongoDB Atlas'); process.exit(0); }).catch(err => { console.error('❌ Connection failed:', err.message); process.exit(1); });"
```

## Data Migration (If Needed)

If you have data in local MongoDB that needs to be in Atlas:

### Export from Local MongoDB
```bash
# Export all collections
mongodump --db giglink --out ./backup

# Or export specific collections
mongodump --db giglink --collection users --out ./backup
mongodump --db giglink --collection profiles --out ./backup
```

### Import to MongoDB Atlas
```bash
# Import to Atlas (replace with your connection string)
mongorestore --uri "mongodb+srv://oscarhuanxi_db_user:DwPibFAclkhKLkXK@cluster0.uh3xwth.mongodb.net/giglink" ./backup/giglink
```

## Troubleshooting

### Common Issues

1. **Dynamic IP Address**
   - If your IP changes frequently, consider:
   - Adding a range of IPs
   - Using a VPN with static IP
   - Temporarily allowing all IPs for development

2. **Corporate Network/Firewall**
   - Your network might block MongoDB Atlas ports
   - Try connecting from a different network
   - Contact your network administrator

3. **Connection String Issues**
   - Ensure the database name `giglink` is in the URI
   - Verify username and password are correct
   - Check for special characters that need URL encoding

### Verify Database Name in Atlas

1. Go to MongoDB Atlas Dashboard
2. Click on your cluster
3. Click "Browse Collections"
4. Verify you see the `giglink` database
5. If not, create it or check your connection string

## Current Fallback Behavior

Your application is configured with smart fallback:

1. **Primary**: Tries MongoDB Atlas connection
2. **Fallback**: Uses local MongoDB (`mongodb://localhost:27017/giglink`)
3. **Result**: Currently using local MongoDB due to Atlas IP whitelist

## Recommendations

### For Development
1. ✅ Keep the current fallback system
2. ✅ Fix Atlas IP whitelist for cloud access
3. ✅ Use local MongoDB for offline development

### For Production
1. ✅ Use MongoDB Atlas exclusively
2. ✅ Set up proper IP whitelisting
3. ✅ Enable Atlas automated backups
4. ✅ Monitor connection health

## Next Steps

1. **Immediate**: Add your IP to Atlas whitelist
2. **Test**: Verify Atlas connection works
3. **Sync**: Ensure data consistency between local and Atlas
4. **Monitor**: Set up alerts for connection issues

---

**Note**: Your data is currently coming from the correct `giglink` database in local MongoDB. Once Atlas connection is fixed, ensure both databases have the same data structure and content.