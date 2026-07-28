import { useState, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { Save, Loader2 } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { AppGoldRule } from "../../client/components/brand/AppChrome";
import { createHousehold } from "wasp/client/operations";
import PhoneMaskInput from "../../client/components/PhoneMaskInput";
import { useViaCep } from "../../client/hooks/useViaCep";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { Alert } from "../../client/components/ui/alert";

interface CreateHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (householdId: string, householdName: string) => void;
}

export default function CreateHouseholdModal({
  isOpen,
  onClose,
  onCreated,
}: CreateHouseholdModalProps) {
  const { t } = useTranslation("common");
  const { activeParishId } = useActiveParish();
  const nameId = useId();
  const cepId = useId();
  const addressId = useId();
  const phoneId = useId();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [cep, setCep] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cepAutoFilled, setCepAutoFilled] = useState(false);

  const { data: cepData, loading: cepLoading } = useViaCep(cep);

  // Auto-populate address from ViaCEP
  useEffect(() => {
    if (cepData && !cepAutoFilled) {
      const parts = [
        cepData.street,
        cepData.neighborhood && `- ${cepData.neighborhood}`,
        cepData.city && `- ${cepData.city}/${cepData.state}`,
      ].filter(Boolean);
      setAddress(parts.join(" ") || address);
      setCepAutoFilled(true);
    }
  }, [cepData]);

  // Reset autoFilled when CEP changes
  useEffect(() => {
    setCepAutoFilled(false);
  }, [cep]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setAddress("");
      setCep("");
      setPhone("");
      setError("");
      setCepAutoFilled(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name) {
      setError(t("families.name_required"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const household = await createHousehold({
        name,
        address: address || undefined,
        phone: phone || undefined,
        parishId: activeParishId || undefined,
      });
      onCreated(household.id, household.name);
      onClose();
    } catch (err: any) {
      setError(err.message || t("families.create_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base">
            {t("families.create_title")}
          </DialogTitle>
          <AppGoldRule className="w-8" />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert role="alert" variant="destructive">
              {error}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor={nameId}>{t("families.name_label")}</Label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("families.name_placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={cepId}>{t("families.cep")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id={cepId}
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder={t("cep_placeholder")}
                className="w-40"
              />
              {cepLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={addressId}>{t("address")}</Label>
            <Input
              id={addressId}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("families.address_placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={phoneId}>{t("phone")}</Label>
            <PhoneMaskInput
              id={phoneId}
              value={phone}
              onChange={setPhone}
              placeholder={t("phone_placeholder")}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t("saving") : t("register")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
