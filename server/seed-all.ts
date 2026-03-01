
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Student, Gender as StudentGender, StudentStatus } from './src/modules/students/entities/student.entity';
import { Teacher, Gender as TeacherGender, TeacherStatus } from './src/modules/teachers/entities/teacher.entity';
import { Subject, SubjectStatus } from './src/modules/subjects/entities/subject.entity';
import { fakerZH_CN as faker } from '@faker-js/faker';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const studentRepository = dataSource.getRepository(Student);
  const teacherRepository = dataSource.getRepository(Teacher);
  const subjectRepository = dataSource.getRepository(Subject);

  console.log('Starting seeding process...');

  // 1. Seed Subjects (5 subjects)
  console.log('Seeding 5 subjects...');
  const subjectNames = ['素描', '水彩', '油画', '书法', '国画'];
  const subjects: Subject[] = [];
  
  for (const name of subjectNames) {
    let subject = await subjectRepository.findOne({ where: { name } });
    if (!subject) {
      subject = new Subject();
      subject.name = name;
      subject.price = parseFloat(faker.commerce.price({ min: 100, max: 500, dec: 2 })); // 100-500 yuan
      subject.status = SubjectStatus.ACTIVE;
      await subjectRepository.save(subject);
      console.log(`Created subject: ${name}`);
    } else {
      console.log(`Subject ${name} already exists.`);
    }
    subjects.push(subject);
  }

  // 2. Seed Teachers (10 teachers)
  console.log('Seeding 10 teachers...');
  const teachers: Teacher[] = [];
  for (let i = 0; i < 10; i++) {
    const gender = faker.helpers.arrayElement([TeacherGender.MALE, TeacherGender.FEMALE]);
    const teacher = new Teacher();
    teacher.name = faker.person.fullName({ sex: gender === TeacherGender.MALE ? 'male' : 'female' });
    teacher.gender = gender;
    teacher.phone = faker.helpers.fromRegExp(/1[3-9]\d{9}/);
    
    // Generate ID card
    const areaCode = faker.string.numeric(6);
    const birthDate = faker.date.birthdate({ min: 25, max: 55, mode: 'age' });
    const birthDateStr = birthDate.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = faker.string.numeric(3);
    const checkDigit = faker.string.numeric(1);
    teacher.id_card = `${areaCode}${birthDateStr}${sequence}${checkDigit}`;

    teacher.status = faker.helpers.arrayElement([TeacherStatus.ACTIVE, TeacherStatus.ACTIVE, TeacherStatus.INACTIVE]);
    
    // Assign random subjects (1-3 subjects per teacher)
    const numSubjects = faker.number.int({ min: 1, max: 3 });
    teacher.subjects = faker.helpers.arrayElements(subjects, numSubjects);

    teachers.push(teacher);
  }
  await teacherRepository.save(teachers);
  console.log(`Created ${teachers.length} teachers.`);

  // 3. Seed Students (50 students)
  console.log('Seeding 50 students...');
  const students: Student[] = [];
  for (let i = 0; i < 50; i++) {
    const gender = faker.helpers.arrayElement([StudentGender.MALE, StudentGender.FEMALE]);
    const student = new Student();
    student.name = faker.person.fullName({ sex: gender === StudentGender.MALE ? 'male' : 'female' });
    student.gender = gender;
    
    // Generate ID card
    const areaCode = faker.string.numeric(6);
    const birthDate = faker.date.birthdate({ min: 6, max: 18, mode: 'age' });
    const birthDateStr = birthDate.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = faker.string.numeric(3);
    const checkDigit = faker.string.numeric(1);
    student.id_card = `${areaCode}${birthDateStr}${sequence}${checkDigit}`;
    
    student.birth_date = birthDate;
    student.address = faker.location.streetAddress({ useFullAddress: true });
    student.emergency_contact = faker.person.fullName();
    student.emergency_phone = faker.helpers.fromRegExp(/1[3-9]\d{9}/);
    student.registration_date = faker.date.past({ years: 2 });
    student.status = faker.helpers.arrayElement([StudentStatus.ACTIVE, StudentStatus.ACTIVE, StudentStatus.ACTIVE, StudentStatus.INACTIVE, StudentStatus.GRADUATED]);
    student.remark = faker.lorem.sentence();

    students.push(student);
  }
  await studentRepository.save(students);
  console.log(`Created ${students.length} students.`);

  console.log('Seeding complete!');
  await app.close();
}

seed();
