import { BadRequestException, Controller, Get, HttpStatus, Param, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { isValid } from 'date-fns'
import { ApiQueryDetails } from '../api.swagger'
import { type PaginationQuery, SortQuery } from '../types'
import { ProgramService } from './program.service'
import { PaginatedProgramsResponse, ProgramSortField } from './types'

type ParsedPagination = {
    page: number
    limit: number
    sort: ProgramSortField
    order: SortQuery
}

@ApiTags('Programs')
@ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
})
@Controller()
export class ProgramController {
    public constructor(private readonly programService: ProgramService) {}

    @Get('program/:id')
    @ApiOperation({
        summary: 'Get a program by id',
        description: 'Lookup a program by its UUID.',
    })
    @ApiParam({
        name: 'id',
        description: 'Program UUID',
    })
    @ApiOkResponse({
        description: 'Program details',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Program not found',
    })
    public async getProgram(@Param('id') programId: string) {
        return this.programService.getProgramById(programId)
    }

    @Get('programs/now')
    @ApiOperation({
        summary: 'List currently airing programs',
        description: 'Returns a paginated list of programs airing now.',
    })
    @ApiQuery(ApiQueryDetails.page)
    @ApiQuery(ApiQueryDetails.limit)
    @ApiQuery(
        ApiQueryDetails.sort({
            enum: ProgramSortField,
            example: ProgramSortField.StartAt,
        }),
    )
    @ApiQuery(
        ApiQueryDetails.order({
            enum: SortQuery,
            example: SortQuery.ASC,
        }),
    )
    @ApiOkResponse({
        description: 'Paginated list of current programs',
    })
    public async getCurrentPrograms(@Query() query: PaginationQuery<ProgramSortField>): Promise<PaginatedProgramsResponse> {
        const { page, limit, sort, order } = this.parsePagination(query)
        const result = await this.programService.listCurrentPrograms({
            page,
            limit,
            sort,
            order,
        })

        return result
    }

    @Get('programs/:day')
    @ApiOperation({
        summary: 'List programs for a specific day',
        description: 'Returns a paginated list of programs for the specified day.',
    })
    @ApiParam({
        name: 'day',
        description: 'Date in YYYY-MM-DD format',
    })
    @ApiQuery(ApiQueryDetails.page)
    @ApiQuery(ApiQueryDetails.limit)
    @ApiOkResponse({
        description: 'Paginated list of programs for the day',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid date format',
    })
    public async getProgramsByDay(
        @Param('day') dayStr: string,
        @Query() query: PaginationQuery<ProgramSortField>,
    ): Promise<PaginatedProgramsResponse> {
        const date = this.validateDate(dayStr)
        const { page, limit } = this.parsePagination(query)

        return this.programService.listProgramsByDay({
            day: date,
            page,
            limit,
        })
    }

    private validateDate(dateStr: string): Date {
        const date = new Date(`${dateStr}T00:00:00Z`)

        if (!isValid(date)) {
            throw new BadRequestException('invalid_date')
        }

        return date
    }

    private parsePagination(query: PaginationQuery<ProgramSortField>): ParsedPagination {
        const sort = Object.values(ProgramSortField).includes(query.sort as ProgramSortField)
            ? (query.sort as ProgramSortField)
            : ProgramSortField.StartAt

        return {
            page: Math.max(1, Number(query.page) || 1),
            limit: Math.min(100, Number(query.limit) || 20),
            sort,
            order: query.order === SortQuery.DESC ? SortQuery.DESC : SortQuery.ASC,
        }
    }
}
