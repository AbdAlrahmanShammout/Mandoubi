import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ChangePrimaryWarehouseRequestDto } from '@/modules/product/dto/request/change-primary-warehouse-request.dto';
import { CreateProductRequestDto } from '@/modules/product/dto/request/create-product-request.dto';
import { ReplaceProductStocksRequestDto } from '@/modules/product/dto/request/replace-product-stocks-request.dto';
import { UpdateProductRequestDto } from '@/modules/product/dto/request/update-product-request.dto';
import { UpdateProductStockQuantityRequestDto } from '@/modules/product/dto/request/update-product-stock-quantity-request.dto';
import { ProductResponse } from '@/modules/product/dto/response/model/product.response';
import { ProductService } from '@/modules/product/product.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Products and stock managed from the admin dashboard.
 */
@ApiTags('Admin products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/products')
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}
  /**
   * Creates a product and links it to one or more warehouses.
   */
  @Post()
  @ApiOperation({ summary: 'Create a product' })
  async create(@Body() body: CreateProductRequestDto): Promise<ProductResponse> {
    const product = await this.productService.createProduct(body);
    return new ProductResponse(product);
  }
  /**
   * Lists products.
   */
  @Get()
  @ApiOperation({ summary: 'List products' })
  async list(): Promise<ProductResponse[]> {
    const products = await this.productService.listProducts();
    return products.map((product) => new ProductResponse(product));
  }
  /**
   * Reads one product and its warehouse quantities.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read a product' })
  async getProduct(@Param('id', ParseIntPipe) id: number): Promise<ProductResponse> {
    const product = await this.productService.getProductById(id);
    return new ProductResponse(product);
  }
  /**
   * Changes product data without changing warehouse quantities.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateProductRequestDto): Promise<ProductResponse> {
    const product = await this.productService.updateProduct({ id, ...body });
    return new ProductResponse(product);
  }
  /**
   * Replaces the warehouses linked to a product and their quantities.
   */
  @Put(':id/stocks')
  @ApiOperation({ summary: 'Replace product warehouse quantities' })
  async replaceStocks(@Param('id', ParseIntPipe) id: number, @Body() body: ReplaceProductStocksRequestDto): Promise<ProductResponse> {
    const product = await this.productService.replaceStocks(id, body.stocks);
    return new ProductResponse(product);
  }
  /**
   * Changes the quantity in one warehouse.
   */
  @Patch(':id/stocks/:warehouseId')
  @ApiOperation({ summary: 'Update one warehouse quantity' })
  async updateQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Param('warehouseId', ParseIntPipe) warehouseId: number,
    @Body() body: UpdateProductStockQuantityRequestDto,
  ): Promise<ProductResponse> {
    const product = await this.productService.updateStockQuantity(id, warehouseId, body.quantity);
    return new ProductResponse(product);
  }
  /**
   * Chooses the only primary warehouse among the linked warehouses.
   */
  @Patch(':id/primary-warehouse')
  @ApiOperation({ summary: 'Change the primary warehouse' })
  async changePrimary(@Param('id', ParseIntPipe) id: number, @Body() body: ChangePrimaryWarehouseRequestDto): Promise<ProductResponse> {
    const product = await this.productService.changePrimaryWarehouse(id, body.warehouseId);
    return new ProductResponse(product);
  }
}
