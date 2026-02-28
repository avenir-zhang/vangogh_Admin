import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  create(@Body() createTeacherDto: any) {
    return this.teachersService.create(createTeacherDto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.teachersService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeacherDto: any) {
    return this.teachersService.update(+id, updateTeacherDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teachersService.remove(+id);
  }
}
