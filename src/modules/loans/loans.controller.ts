import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ListLoansQueryDto } from './dto/list-loans-query.dto';
import { LoanIdParamDto } from './dto/loan-id-param.dto';
import { LoanResponseDto } from './dto/loan-response.dto';
import { LoansService } from './loans.service';

@ApiTags('loans')
@ApiBearerAuth()
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a loan' })
  @ApiCreatedResponse({ type: LoanResponseDto })
  create(@Body() dto: CreateLoanDto): Promise<LoanResponseDto> {
    return this.loansService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List loans' })
  @ApiOkResponse({ type: LoanResponseDto, isArray: true })
  findAll(@Query() query: ListLoansQueryDto): Promise<LoanResponseDto[]> {
    return this.loansService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan detail' })
  @ApiOkResponse({ type: LoanResponseDto })
  findOne(@Param() params: LoanIdParamDto): Promise<LoanResponseDto> {
    return this.loansService.findOne(params.id);
  }

  @Patch(':id/return')
  @ApiOperation({ summary: 'Return a loan and calculate fine' })
  @ApiOkResponse({ type: LoanResponseDto })
  returnLoan(@Param() params: LoanIdParamDto): Promise<LoanResponseDto> {
    return this.loansService.returnLoan(params.id);
  }

  @Patch(':id/mark-lost')
  @ApiOperation({ summary: 'Mark a loan as lost' })
  @ApiOkResponse({ type: LoanResponseDto })
  markLost(@Param() params: LoanIdParamDto): Promise<LoanResponseDto> {
    return this.loansService.markLost(params.id);
  }
}
