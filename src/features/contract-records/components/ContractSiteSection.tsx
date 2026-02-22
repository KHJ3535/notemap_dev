"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/Card/Card";
import { Input } from "@/components/atoms/Input/Input";
import { Label } from "@/components/atoms/Label/Label";
import { formatPhone } from "@/lib/formatPhone";
import type { ContractSiteInfo } from "../types/contract-records";

interface ContractSiteSectionProps {
  contractSite: ContractSiteInfo;
  onContractSiteChange: (info: ContractSiteInfo) => void;
  readOnly?: boolean;
}

export function ContractSiteSection({
  contractSite,
  onContractSiteChange,
  readOnly = false,
}: ContractSiteSectionProps) {
  return (
    <Card className="flex-shrink-0">
      <CardHeader className="pb-1 pt-2 px-3">
        <CardTitle className="text-sm">계약현장</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2 space-y-1">
            <Label
              htmlFor="contract-site-address"
              className="text-xs text-muted-foreground"
            >
              주소
            </Label>
            <Input
              id="contract-site-address"
              value={contractSite.address}
              onChange={(e) =>
                onContractSiteChange({
                  ...contractSite,
                  address: e.target.value,
                })
              }
              className="h-7 text-xs"
              placeholder="주소 입력"
              readOnly={readOnly}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="contract-site-name"
              className="text-xs text-muted-foreground"
            >
              현장명
            </Label>
            <Input
              id="contract-site-name"
              value={contractSite.siteName}
              onChange={(e) =>
                onContractSiteChange({
                  ...contractSite,
                  siteName: e.target.value,
                })
              }
              className="h-7 text-xs"
              placeholder="현장명 입력"
              readOnly={readOnly}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="contract-site-team-contact"
              className="text-xs text-muted-foreground"
            >
              분양팀 연락처
            </Label>
            <Input
              id="contract-site-team-contact"
              value={contractSite.teamContact}
              onChange={(e) =>
                onContractSiteChange({
                  ...contractSite,
                  teamContact: formatPhone(e.target.value),
                })
              }
              className="h-7 text-xs"
              placeholder="010-1234-5678"
              readOnly={readOnly}
              disabled={readOnly}
              inputMode="tel"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

