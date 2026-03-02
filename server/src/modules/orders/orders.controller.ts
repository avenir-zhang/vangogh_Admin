import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: any) {
    if (Array.isArray(createOrderDto)) {
        return this.ordersService.createBatch(createOrderDto);
    }
    // 现在只有 createBatch 支持新的 { items: ... } 结构
    // 如果还是旧的单个创建请求，也可以路由到 createBatch，或者恢复 create 方法
    // 鉴于前端已经改为发送 { items: ... } 结构（虽然不是数组，是包含 items 数组的对象）
    // 我们应该统一调用 createBatch
    return this.ordersService.createBatch(createOrderDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateOrderDto: Partial<Order>) {
      // 订单只能更新状态（如作废），其他信息一般不允许随意更改，特别是金额
      // 如果要支持更新，需要谨慎处理
      try {
          return await this.ordersService.update(+id, updateOrderDto);
      } catch (err: any) {
          if (err.message === 'ORDER_HAS_CONSUMPTION') {
              throw new BadRequestException('订单已发生课时消耗，无法作废。请先撤销相关签到记录。');
          }
          throw err;
      }
  }

  @Post(':id/supplement')
  supplement(@Param('id') id: string, @Body() body: { amount: number }) {
      return this.ordersService.supplement(+id, body.amount);
  }

  @Patch(':id/expire-date')
  updateExpireDate(@Param('id') id: string, @Body() body: { expire_date: string | null }) {
      return this.ordersService.updateExpireDate(+id, body.expire_date);
  }

  @Post(':id/transfer')
  transfer(@Param('id') id: string, @Body() body: { targetStudentId: number, subjectId?: number, amount?: number }) {
      return this.ordersService.transfer(+id, body.targetStudentId, body.subjectId ? { subjectId: body.subjectId, amount: body.amount } : undefined);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
