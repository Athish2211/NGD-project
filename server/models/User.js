const { query } = require('../config/database');
const { getCache, setCache, deleteCache } = require('../config/redis');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class User {
  static async create(userData) {
    try {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);
      
      const result = await query(`
        INSERT INTO users (email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, first_name, last_name, created_at
      `, [userData.email, passwordHash, userData.first_name, userData.last_name]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }
  
  static async findByEmail(email) {
    try {
      const result = await query(`
        SELECT * FROM users WHERE email = $1
      `, [email]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    try {
      const cacheKey = `user:${id}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;
      
      const result = await query(`
        SELECT id, email, first_name, last_name, created_at, updated_at
        FROM users WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) return null;
      
      const user = result.rows[0];
      await setCache(cacheKey, user, 600); // 10 minutes cache
      return user;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }
  
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error verifying password:', error);
      throw error;
    }
  }
  
  static async generateToken(user) {
    try {
      const payload = {
        id: user.id,
        email: user.email
      };
      
      return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    } catch (error) {
      logger.error('Error generating token:', error);
      throw error;
    }
  }
  
  static async verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.error('Error verifying token:', error);
      throw error;
    }
  }
  
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'password') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(id);
      
      const result = await query(`
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, first_name, last_name, created_at, updated_at
      `, values);
      
      if (result.rows.length === 0) return null;
      
      await deleteCache(`user:${id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }
  
  static async updatePassword(id, newPassword) {
    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      const result = await query(`
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, email, first_name, last_name, created_at, updated_at
      `, [passwordHash, id]);
      
      if (result.rows.length === 0) return null;
      
      await deleteCache(`user:${id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }
}

module.exports = User;
