import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemIdParamDto } from './dto/item-id-param.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@ApiTags('items')
@ApiBearerAuth()
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an item' })
  @ApiCreatedResponse({ type: ItemResponseDto })
  create(@Body() dto: CreateItemDto): Promise<ItemResponseDto> {
    return this.itemsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List active items' })
  @ApiOkResponse({ type: ItemResponseDto, isArray: true })
  findAll(@Query() query: ListItemsQueryDto): Promise<ItemResponseDto[]> {
    return this.itemsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item detail' })
  @ApiOkResponse({ type: ItemResponseDto })
  findOne(@Param() params: ItemIdParamDto): Promise<ItemResponseDto> {
    return this.itemsService.findOne(params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update item title or type' })
  @ApiOkResponse({ type: ItemResponseDto })
  update(@Param() params: ItemIdParamDto, @Body() dto: UpdateItemDto): Promise<ItemResponseDto> {
    return this.itemsService.update(params.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete item' })
  @ApiNoContentResponse()
  remove(@Param() params: ItemIdParamDto): Promise<void> {
    return this.itemsService.remove(params.id);
  }
}
