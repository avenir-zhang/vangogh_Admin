import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Student, Gender, StudentStatus } from './src/modules/students/entities/student.entity';
import { fakerZH_CN as faker } from '@faker-js/faker';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const studentRepository = dataSource.getRepository(Student);

  console.log('Seeding students...');

  const students: Student[] = [];

  for (let i = 0; i < 50; i++) {
    const gender = faker.helpers.arrayElement([Gender.MALE, Gender.FEMALE]);
    const student = new Student();
    student.name = faker.person.fullName({ sex: gender === Gender.MALE ? 'male' : 'female' });
    student.gender = gender;
    // Generate a somewhat realistic ID card number (not valid, just format)
    // 6 digit area code + 8 digit birthdate + 3 digit sequence + 1 check digit
    const areaCode = faker.string.numeric(6);
    const birthDate = faker.date.birthdate({ min: 5, max: 18, mode: 'age' });
    const birthDateStr = birthDate.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = faker.string.numeric(3);
    const checkDigit = faker.string.numeric(1);
    student.id_card = `${areaCode}${birthDateStr}${sequence}${checkDigit}`;
    
    student.birth_date = birthDate;
    student.address = faker.location.streetAddress({ useFullAddress: true });
    student.emergency_contact = faker.person.fullName();
    student.emergency_phone = faker.phone.number();
    student.registration_date = faker.date.past({ years: 2 });
    student.status = faker.helpers.arrayElement([StudentStatus.ACTIVE, StudentStatus.ACTIVE, StudentStatus.ACTIVE, StudentStatus.INACTIVE, StudentStatus.GRADUATED]);
    student.remark = faker.lorem.sentence();

    students.push(student);
  }

  await studentRepository.save(students);

  console.log('Seeding complete!');
  await app.close();
}

seed();
