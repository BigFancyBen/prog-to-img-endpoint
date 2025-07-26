#!/usr/bin/env node

import OSRSDataService from '../services/osrsDataService.js'

async function testSummary() {
  try {
    const summary = await OSRSDataService.getDataSummary()
    console.log('Summary:', summary)
  } catch (error) {
    console.error('Error:', error)
  }
}

testSummary()
