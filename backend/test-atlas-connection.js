const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://oscarhuanxi_db_user:DwPibFAclkhKLkXK@cluster0.uh3xwth.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB Atlas!");
    
    // Test connection to giglink database
    const db = client.db("giglink");
    const collections = await db.listCollections().toArray();
    console.log("📊 Available collections in giglink database:", collections.map(c => c.name));
    
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    if (error.message.includes('IP')) {
      console.log("\n🔧 This appears to be an IP whitelist issue.");
      console.log("Please add your current IP address to MongoDB Atlas Network Access.");
    }
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);