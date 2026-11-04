import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { MONEY_PATTERN } from '@/modules/product/constants/money.constant';
import { ProductStockRequestDto } from '@/modules/product/dto/request/product-stock-request.dto';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Product opened by an administrator, including its warehouse quantities.
 */
export class CreateProductRequestDto {
  @ApiProperty({ description: 'Product name', example: 'Paracetamol 500' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;
  @ApiProperty({ description: 'Product barcode', example: '6281000000001' })
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  barcode!: string;
  @ApiProperty({ description: 'Selected manufacturer', example: 1 })
  @IsInt()
  @Min(1)
  manufacturerId!: number;
  @ApiProperty({ description: 'Active ingredient', example: 'Paracetamol' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  activeIngredient!: string;
  @ApiPropertyOptional({ description: 'Product image address', example: 'https://cdn.example.com/paracetamol.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
  @ApiProperty({ description: 'Minimum quantity that can be ordered', example: 1 })
  @IsInt()
  @Min(1)
  minimumOrderQuantity!: number;
  @ApiProperty({ description: 'Maximum paid quantity that can be ordered', example: 100 })
  @IsInt()
  @Min(1)
  maximumOrderQuantity!: number;
  @ApiProperty({ description: 'Primary-warehouse quantity that shows a limited-stock alert', example: 5 })
  @IsInt()
  @Min(0)
  lowQuantityThreshold!: number;
  @ApiProperty({ description: 'Pharmacy selling price in US dollars', example: '2.50' })
  @IsString()
  @Matches(MONEY_PATTERN)
  pharmacyPriceUsd!: string;
  @ApiPropertyOptional({ description: 'Pharmacy selling price in Syrian pounds. Required when calculation is off.', example: '40000' })
  @ValidateIf((dto: CreateProductRequestDto) => dto.calculateSypFromRate !== true)
  @IsString()
  @Matches(MONEY_PATTERN)
  pharmacyPriceSyp?: string;
  @ApiProperty({ description: 'Suggested consumer price in US dollars', example: '3.00' })
  @IsString()
  @Matches(MONEY_PATTERN)
  consumerPriceUsd!: string;
  @ApiPropertyOptional({ description: 'Suggested consumer price in Syrian pounds. Required when calculation is off.', example: '50000' })
  @ValidateIf((dto: CreateProductRequestDto) => dto.calculateSypFromRate !== true)
  @IsString()
  @Matches(MONEY_PATTERN)
  consumerPriceSyp?: string;
  @ApiPropertyOptional({ description: 'Calculate Syrian-pound prices from the exchange rate', example: false })
  @IsOptional()
  @IsBoolean()
  calculateSypFromRate?: boolean;
  @ApiPropertyOptional({ description: 'Currency recorded on invoices. Defaults to the Syrian pound.', enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  @IsOptional()
  @IsEnum(InvoiceCurrency)
  invoiceCurrency?: InvoiceCurrency;
  @ApiProperty({ description: 'Warehouse quantities. One warehouse is primary.', type: [ProductStockRequestDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductStockRequestDto)
  stocks!: ProductStockRequestDto[];
}
