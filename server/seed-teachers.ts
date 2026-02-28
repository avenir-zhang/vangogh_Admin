import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Teacher, Gender, TeacherStatus } from './src/modules/teachers/entities/teacher.entity';
import { Subject } from './src/modules/subjects/entities/subject.entity';
import { fakerZH_CN as faker } from '@faker-js/faker';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const teacherRepository = dataSource.getRepository(Teacher);
  const subjectRepository = dataSource.getRepository(Subject);

  console.log('Seeding teachers...');

  const subjects = await subjectRepository.find();
  if (subjects.length === 0) {
    console.log('No subjects found. Please seed subjects first or create some manually.');
    // Create some dummy subjects if none exist
    const dummySubjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Art'].map(name => {
        const s = new Subject();
        s.name = name;
        s.price = parseFloat(faker.commerce.price({ min: 100, max: 1000 }));
        return s;
    });
    await subjectRepository.save(dummySubjects);
    subjects.push(...dummySubjects);
  }

  const teachers: Teacher[] = [];

  for (let i = 0; i < 10; i++) {
    const gender = faker.helpers.arrayElement([Gender.MALE, Gender.FEMALE]);
    const teacher = new Teacher();
    teacher.name = faker.person.fullName({ sex: gender === Gender.MALE ? 'male' : 'female' });
    teacher.gender = gender;
    teacher.phone = faker.phone.number();
    
    // Generate ID card
    const areaCode = faker.string.numeric(6);
    const birthDate = faker.date.birthdate({ min: 22, max: 60, mode: 'age' });
    const birthDateStr = birthDate.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = faker.string.numeric(3);
    const checkDigit = faker.string.numeric(1);
    teacher.id_card = `${areaCode}${birthDateStr}${sequence}${checkDigit}`;

    teacher.status = faker.helpers.arrayElement([TeacherStatus.ACTIVE, TeacherStatus.ACTIVE, TeacherStatus.INACTIVE]);
    
    // Assign random subjects
    const numSubjects = faker.number.int({ min: 1, max: 3 });
    teacher.subjects = faker.helpers.arrayElements(subjects, numSubjects);

    teachers.push(teacher);
  }

  await teacherRepository.save(teachers);

  console.log('Seeding teachers complete!');
  await app.close();
}

seed();
