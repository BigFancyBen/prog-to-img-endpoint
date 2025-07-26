#!/usr/bin/env node

import db from '../services/databaseService.js'

async function checkSchema() {
  try {
    await db.init()
    
    console.log('=== MONSTERS TABLE SCHEMA ===')
    const monstersSchema = db.db.prepare('PRAGMA table_info(monsters)').all()
    console.log(monstersSchema)
    
    console.log('\n=== PRAYERS TABLE SCHEMA ===')
    const prayersSchema = db.db.prepare('PRAGMA table_info(prayers)').all()
    console.log(prayersSchema)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkSchema()
