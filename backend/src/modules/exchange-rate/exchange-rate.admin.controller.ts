import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ReplaceExchangeRateRequestDto } from '@/modules/exchange-rate/dto/request/replace-exchange-rate-request.dto';
import { ExchangeRateResponse } from '@/modules/exchange-rate/dto/response/model/exchange-rate.response';
import { ExchangeRateService } from '@/modules/exchange-rate/exchange-rate.service';
import { ProductService } from '@/modules/product/product.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * The USD to Syrian-pound setting managed from the admin dashboard.
 */
@ApiTags('Admin exchange rate')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/exchange-rate')
export class ExchangeRateAdminController {
  constructor(
    private readonly exchangeRateService: ExchangeRateService,
    private readonly productService: ProductService,
  ) {}
  /**
   * Reads the current exchange rate.
   */
  @Get()
  @ApiOperation({ summary: 'Read the exchange rate' })
  async getRate(): Promise<ExchangeRateResponse> {
    const rate = await this.exchangeRateService.getExchangeRate();
    return new ExchangeRateResponse(rate);
  }
  /**
   * Replaces the exchange rate and refreshes calculated Syrian-pound prices.
   */
  @Put()
  @ApiOperation({ summary: 'Replace the exchange rate' })
  async replace(@Body() body: ReplaceExchangeRateRequestDto): Promise<ExchangeRateResponse> {
    const rate = await this.exchangeRateService.replaceUsdToSyp(body.usdToSyp);
    await this.productService.applyExchangeRate(rate.usdToSyp);
    return new ExchangeRateResponse(rate);
  }
}
