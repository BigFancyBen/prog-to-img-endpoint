#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🔍 Path debugging:')
console.log('__dirname:', __dirname)
console.log('process.cwd():', process.cwd())

const DB_DIR = join(__dirname, '../data')
const DB_PATH = join(DB_DIR, 'osrs.db')

console.log('DB_DIR:', DB_DIR)
console.log('DB_PATH:', DB_PATH)

// Check if file exists
import { existsSync } from 'fs'
console.log('DB file exists:', existsSync(DB_PATH))

// Also check the alternative paths
const cwd_path = join(process.cwd(), 'data', 'osrs.db')
const nitro_path = join(process.cwd(), '.nitro', 'data', 'osrs.db')

console.log('CWD path:', cwd_path, '| exists:', existsSync(cwd_path))
console.log('Nitro path:', nitro_path, '| exists:', existsSync(nitro_path))
