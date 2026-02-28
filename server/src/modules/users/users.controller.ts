import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() user: Partial<User>): Promise<User> {
    return this.usersService.create(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
