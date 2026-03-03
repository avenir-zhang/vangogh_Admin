
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function clearOrders() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  console.log('Starting to clear order related data...');

  try {
    // Use raw queries to avoid TypeORM safety checks and handle deletion order explicitly
    
    // 1. Delete all Attendances
    console.log('Deleting all Attendances...');
    await dataSource.query('DELETE FROM attendances');
    console.log('All Attendances deleted.');

    // 2. Delete all StudentCourses
    console.log('Deleting all StudentCourses...');
    await dataSource.query('DELETE FROM student_courses');
    console.log('All StudentCourses deleted.');

    // 3. Delete Orders
    // Delete sub-orders first to avoid FK constraint on parent_id
    console.log('Deleting sub-orders...');
    await dataSource.query('DELETE FROM orders WHERE parent_id IS NOT NULL');
    console.log('Sub-orders deleted.');

    // Delete main orders
    console.log('Deleting main orders...');
    await dataSource.query('DELETE FROM orders'); // Only main orders remain now
    console.log('All Orders deleted.');

  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    await app.close();
  }
}

clearOrders();
