import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CreateManufacturerRequestDto } from '@/modules/manufacturer/dto/request/create-manufacturer-request.dto';
import { UpdateManufacturerRequestDto } from '@/modules/manufacturer/dto/request/update-manufacturer-request.dto';
import { UpdateManufacturerStatusRequestDto } from '@/modules/manufacturer/dto/request/update-manufacturer-status-request.dto';
import { ManufacturerResponse } from '@/modules/manufacturer/dto/response/model/manufacturer.response';
import { ManufacturerService } from '@/modules/manufacturer/manufacturer.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Manufacturers managed from the admin dashboard.
 */
@ApiTags('Admin manufacturers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/manufacturers')
export class ManufacturerAdminController {
  constructor(private readonly manufacturerService: ManufacturerService) {}
  /**
   * Opens a manufacturer that products can select.
   */
  @Post()
  @ApiOperation({ summary: 'Create a manufacturer' })
  async create(@Body() body: CreateManufacturerRequestDto): Promise<ManufacturerResponse> {
    const manufacturer = await this.manufacturerService.createManufacturer(body.name);
    return new ManufacturerResponse(manufacturer);
  }
  /**
   * Lists manufacturers.
   */
  @Get()
  @ApiOperation({ summary: 'List manufacturers' })
  async list(): Promise<ManufacturerResponse[]> {
    const manufacturers = await this.manufacturerService.listManufacturers();
    return manufacturers.map((manufacturer) => new ManufacturerResponse(manufacturer));
  }
  /**
   * Reads one manufacturer.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read a manufacturer' })
  async getManufacturer(@Param('id', ParseIntPipe) id: number): Promise<ManufacturerResponse> {
    const manufacturer = await this.manufacturerService.getManufacturerById(id);
    return new ManufacturerResponse(manufacturer);
  }
  /**
   * Renames a manufacturer.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Rename a manufacturer' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateManufacturerRequestDto): Promise<ManufacturerResponse> {
    const manufacturer = await this.manufacturerService.updateManufacturer({ id, name: body.name });
    return new ManufacturerResponse(manufacturer);
  }
  /**
   * Activates or deactivates a manufacturer.
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change a manufacturer status' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateManufacturerStatusRequestDto,
  ): Promise<ManufacturerResponse> {
    const manufacturer = await this.manufacturerService.updateStatus({ id, status: body.status });
    return new ManufacturerResponse(manufacturer);
  }
}
