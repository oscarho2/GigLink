// Mock database for demonstration purposes when MongoDB is not available
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

class MockDatabase {
  constructor() {
    this.dataFile = path.join(__dirname, 'mockData.json');
    this.profiles = [];
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.users = data.users || [];
        this.profiles = data.profiles || [];
        this.nextId = data.nextId || 1;
      } else {
        this.users = [];
        this.profiles = [];
        this.nextId = 1;
      }
    } catch (error) {
      console.error('Error loading mock data:', error);
      this.users = [];
      this.profiles = [];
      this.nextId = 1;
    }
  }

  saveData() {
    try {
      const data = {
        users: this.users,
        profiles: this.profiles,
        nextId: this.nextId
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving mock data:', error);
    }
  }

  async createUser(userData) {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const user = {
      _id: this.nextId.toString(),
      id: this.nextId.toString(),
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      avatar: '',
      bio: '',
      location: '',
      instruments: [],
      genres: [],
      experience: '',
      website: '',
      socialLinks: {},
      isAvailableForGigs: true,
      profileCompleted: false,
      date: new Date()
    };
    
    this.users.push(user);
    this.nextId++;
    this.saveData(); // Persist data to file
    
    return user;
  }

  async findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  async findUserById(id) {
    return this.users.find(user => user.id === id || user._id === id);
  }

  async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  async createProfile(profileData) {
    const profile = {
      ...profileData,
      _id: profileData._id || this.nextId.toString(),
      createdAt: new Date()
    };
    
    this.profiles.push(profile);
    this.saveData(); // Persist data to file
    
    return profile;
  }

  async findProfileByUserId(userId) {
    return this.profiles.find(profile => profile.user._id === userId || profile.user._id === String(userId));
  }

  getAllProfiles() {
    return this.profiles;
  }

  async updateProfile(userId, updatedProfileData) {
    const profileIndex = this.profiles.findIndex(profile => profile.user._id === userId || profile.user._id === String(userId));
    
    if (profileIndex !== -1) {
      this.profiles[profileIndex] = updatedProfileData;
      
      // Update user's profileCompleted status
      const userIndex = this.users.findIndex(user => user.id === userId || user._id === userId);
      if (userIndex !== -1) {
        this.users[userIndex].profileCompleted = true;
      }
      
      this.saveData(); // Persist data to file
      return this.profiles[profileIndex];
    }
    
    return null;
  }
}

// Create a singleton instance
const mockDB = new MockDatabase();

module.exports = mockDB;