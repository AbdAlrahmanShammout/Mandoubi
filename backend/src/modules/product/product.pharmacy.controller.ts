import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { PageResponse } from '@/common/paging/page.response';
import { PageQueryDto } from '@/common/paging/page-query.dto';
import { InvoiceService } from '@/modules/invoice/invoice.service';
import { PharmacySessionGuard } from '@/modules/pharmacy/guards/pharmacy-session.guard';
import { ListPharmacyProductsQueryDto } from '@/modules/product/dto/request/list-pharmacy-products-query.dto';
import { MostRequestedProductResponse } from '@/modules/product/dto/response/model/most-requested-product.response';
import { PharmacyProductResponse } from '@/modules/product/dto/response/model/pharmacy-product.response';
import { ProductService } from '@/modules/product/product.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { UserService } from '@/modules/user/user.service';

/**
 * Product catalog for the signed-in pharmacy.
 */
@ApiTags('Pharmacy products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PharmacySessionGuard, RolesGuard)
@Roles(AccountRole.PHARMACY)
@Controller('pharmacy/products')
export class ProductPharmacyController {
  constructor(
    private readonly productService: ProductService,
    private readonly invoiceService: InvoiceService,
    private readonly userService: UserService,
  ) {}
  /**
   * Searches active products and returns one page.
   */
  @Get()
  @ApiOperation({ summary: 'Search the pharmacy catalog' })
  async list(@Query() query: ListPharmacyProductsQueryDto): Promise<PageResponse<PharmacyProductResponse>> {
    const page = await this.productService.searchCatalog(query);
    return new PageResponse(page.items.map((product) => new PharmacyProductResponse(product)), page.total, page.limit, page.offset);
  }
  /**
   * Ranks products by the paid quantity this pharmacy has requested.
   */
  @Get('most-requested')
  @ApiOperation({ summary: 'List the products this pharmacy requested most' })
  async listMostRequested(@LoggedInUser() currentUser: Principal, @Query() query: PageQueryDto): Promise<PageResponse<MostRequestedProductResponse>> {
    const pharmacyId = await this.readPharmacyId(currentUser.id);
    const page = await this.invoiceService.listMostRequested(pharmacyId, query.limit, query.offset);
    return new PageResponse(
      page.items.map((item) => new MostRequestedProductResponse(item.product, item.requestedQuantity)),
      page.total,
      page.limit,
      page.offset,
    );
  }
  /**
   * Reads one product, including a disabled product, so an old invoice can still show its image.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read a pharmacy catalog product' })
  async getProduct(@Param('id', ParseIntPipe) id: number): Promise<PharmacyProductResponse> {
    const product = await this.productService.getProductById(id);
    return new PharmacyProductResponse(product);
  }
  private async readPharmacyId(userId: number): Promise<number> {
    const user = await this.userService.getUserById(userId);
    return requirePharmacyId(user);
  }
}

function requirePharmacyId(user: UserEntity): number {
  if (user.pharmacyId === null) {
    throw new UnauthenticatedException();
  }
  return user.pharmacyId;
}
