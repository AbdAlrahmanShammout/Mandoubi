import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PageResponse } from '@/common/paging/page.response';
import { PageQueryDto } from '@/common/paging/page-query.dto';
import { WarehouseStockResponse } from '@/modules/product/dto/response/model/warehouse-stock.response';
import { ProductService } from '@/modules/product/product.service';
import { CreateWarehouseRequestDto } from '@/modules/warehouse/dto/request/create-warehouse-request.dto';
import { UpdateWarehouseRequestDto } from '@/modules/warehouse/dto/request/update-warehouse-request.dto';
import { WarehouseResponse } from '@/modules/warehouse/dto/response/model/warehouse.response';
import { WarehouseService } from '@/modules/warehouse/warehouse.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Warehouses managed from the admin dashboard.
 */
@ApiTags('Admin warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/warehouses')
export class WarehouseAdminController {
  constructor(
    private readonly warehouseService: WarehouseService,
    private readonly productService: ProductService,
  ) {}
  /**
   * Opens a warehouse.
   */
  @Post()
  @ApiOperation({ summary: 'Create a warehouse' })
  async create(@Body() body: CreateWarehouseRequestDto): Promise<WarehouseResponse> {
    const warehouse = await this.warehouseService.createWarehouse(body);
    return new WarehouseResponse(warehouse);
  }
  /**
   * Searches warehouses and returns one page.
   */
  @Get()
  @ApiOperation({ summary: 'Search warehouses' })
  async list(@Query() query: PageQueryDto): Promise<PageResponse<WarehouseResponse>> {
    const page = await this.warehouseService.searchWarehouses(query);
    return new PageResponse(page.items.map((warehouse) => new WarehouseResponse(warehouse)), page.total, page.limit, page.offset);
  }
  /**
   * Reads one warehouse.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read a warehouse' })
  async getWarehouse(@Param('id', ParseIntPipe) id: number): Promise<WarehouseResponse> {
    const warehouse = await this.warehouseService.getWarehouseById(id);
    return new WarehouseResponse(warehouse);
  }
  /**
   * Lists the products stored in one warehouse and the quantity of each.
   */
  @Get(':id/products')
  @ApiOperation({ summary: 'List products stored in a warehouse' })
  async listProducts(@Param('id', ParseIntPipe) id: number): Promise<WarehouseStockResponse[]> {
    await this.warehouseService.getWarehouseById(id);
    const stocks = await this.productService.listStockByWarehouseId(id);
    return stocks.map((stock) => new WarehouseStockResponse(stock));
  }
  /**
   * Changes the warehouse name or address.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a warehouse' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateWarehouseRequestDto): Promise<WarehouseResponse> {
    const warehouse = await this.warehouseService.updateWarehouse({ id, ...body });
    return new WarehouseResponse(warehouse);
  }
}
