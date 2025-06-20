const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPPORT'],
    default: 'ADMIN'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    manageUsers: {
      type: Boolean,
      default: false
    },
    manageContests: {
      type: Boolean,
      default: false
    },
    managePayments: {
      type: Boolean,
      default: false
    },
    viewReports: {
      type: Boolean,
      default: false
    },
    manageSupportTickets: {
      type: Boolean,
      default: false
    },
    manageSettings: {
      type: Boolean,
      default: false
    },
    manageAdmins: {
      type: Boolean,
      default: false
    }
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

// Set default permissions based on role
AdminSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    switch(this.role) {
      case 'SUPER_ADMIN':
        this.permissions = {
          manageUsers: true,
          manageContests: true,
          managePayments: true,
          viewReports: true,
          manageSupportTickets: true,
          manageSettings: true,
          manageAdmins: true
        };
        break;
      case 'ADMIN':
        this.permissions = {
          manageUsers: true,
          manageContests: true,
          managePayments: true,
          viewReports: true,
          manageSupportTickets: true,
          manageSettings: false,
          manageAdmins: false
        };
        break;
      case 'MANAGER':
        this.permissions = {
          manageUsers: true,
          manageContests: true,
          managePayments: false,
          viewReports: true,
          manageSupportTickets: true,
          manageSettings: false,
          manageAdmins: false
        };
        break;
      case 'SUPPORT':
        this.permissions = {
          manageUsers: false,
          manageContests: false,
          managePayments: false,
          viewReports: true,
          manageSupportTickets: true,
          manageSettings: false,
          manageAdmins: false
        };
        break;
    }
  }
  
  if (this.isModified('password')) {
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
  }
  
  this.updatedAt = Date.now();
  next();
});

// Method to compare passwords
AdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create default super admin if none exists
AdminSchema.statics.createDefaultAdmin = async function() {
  const count = await this.countDocuments();
  if (count === 0) {
    await this.create({
      username: 'admin',
      email: 'admin@tradingplatform.com',
      password: 'admin123', // Will be hashed by pre-save hook
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN'
    });
    console.log('Default admin account created');
  }
};

module.exports = mongoose.model('Admin', AdminSchema); 