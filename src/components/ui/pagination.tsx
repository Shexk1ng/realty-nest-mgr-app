"use client";

// Stronicowanie list z numerami stron i informacją o zakresie wyników

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Pagination as HeroPagination } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";

function fill(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled,
  className,
}: PaginationProps) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalCount, (page + 1) * pageSize);
  const canPrev = !disabled && page > 0;
  const canNext = !disabled && page + 1 < totalPages;

  return (
    <HeroPagination
      size="sm"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      <HeroPagination.Summary>
        {totalCount === 0
          ? tf("common.crud.paginationEmpty", "0 rekordów")
          : fill(tf("common.crud.paginationRange", "{from}–{to} z {total}"), { from, to, total: totalCount })}
      </HeroPagination.Summary>

      <HeroPagination.Content className="flex items-center gap-2">
        <HeroPagination.Item>
          <HeroPagination.Previous
            isDisabled={!canPrev}
            onPress={() => onPageChange(page - 1)}
            aria-label={tf("common.crud.paginationPrev", "Poprzednia strona")}
          >
            <HeroPagination.PreviousIcon>
              <ChevronLeft size={14} />
            </HeroPagination.PreviousIcon>
          </HeroPagination.Previous>
        </HeroPagination.Item>

        <HeroPagination.Item className="min-w-[5.5rem] text-center text-xs font-medium">
          {fill(tf("common.crud.paginationPage", "Strona {page} z {total}"), { page: page + 1, total: totalPages })}
        </HeroPagination.Item>

        <HeroPagination.Item>
          <HeroPagination.Next
            isDisabled={!canNext}
            onPress={() => onPageChange(page + 1)}
            aria-label={tf("common.crud.paginationNext", "Następna strona")}
          >
            <HeroPagination.NextIcon>
              <ChevronRight size={14} />
            </HeroPagination.NextIcon>
          </HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
    </HeroPagination>
  );
}
