import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, apiRequest, errorText, type Area } from "../../auth/api";
import { useToast } from "../../../hooks/useToast";
import XIcon from "../../../shared/icons/XIcon";
import { accountRoles } from "../../auth/roles";

interface InvitationModalProps {
  areas: Area[];
  onClose: () => void;
  onUpdate: () => void | Promise<void>;
}

interface AreaSelection {
  key: number;
  value: string;
}

interface InvitationResult {
  detail: string;
}

const field =
  "w-full bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none";
const label = "text-xs text-neutral-800";
const secondary =
  "bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 px-3 py-1.5 text-xs rounded-lg cursor-pointer";

export default function InvitationModal({
  areas,
  onClose,
  onUpdate,
}: InvitationModalProps) {
  const { addToast } = useToast();
  const nextKey = useRef(1);
  const [firstNames, setFirstNames] = useState("");
  const [lastNames, setLastNames] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TRABAJADOR");
  const [selections, setSelections] = useState<AreaSelection[]>([
    { key: 0, value: "" },
  ]);
  const [allAreas, setAllAreas] = useState(false);
  const [busy, setBusy] = useState(false);
  const canAdd =
    !allAreas &&
    selections.every((item) => item.value) &&
    selections.length < areas.length;
  const disabled = busy || areas.length === 0;

  function changeArea(key: number, value: string) {
    if (value === "all") {
      setAllAreas(true);
      setSelections([{ key: 0, value: "" }]);
    } else if (allAreas) {
      setAllAreas(false);
      setSelections([{ key: 0, value }]);
    } else {
      setSelections((current) =>
        current.map((item) => (item.key === key ? { ...item, value } : item)),
      );
    }
  }

  function addArea() {
    if (!canAdd) return;
    const key = nextKey.current++;
    setSelections((current) => [...current, { key, value: "" }]);
  }

  function clearForm() {
    setFirstNames("");
    setLastNames("");
    setEmail("");
    setSelections([{ key: 0, value: "" }]);
    setAllAreas(false);
    setRole("TRABAJADOR");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await apiRequest<InvitationResult>("admin/invitations/", {
        method: "POST",
        body: JSON.stringify({
          first_names: firstNames,
          last_names: lastNames,
          email,
          role,
          all_areas: allAreas,
          area_ids: allAreas
            ? []
            : selections.map((item) => Number(item.value)),
        }),
      });
      addToast({
        icon: "success",
        title: "Invitación registrada",
        message: result.detail,
      });
      onClose();
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        failure.status === 503 &&
        failure.payload?.account_id
      )
        clearForm();
      addToast({
        icon: "error",
        title: "No se pudo registrar",
        message: errorText(failure),
      });
    } finally {
      await onUpdate();
      setBusy(false);
    }
  }

  return (
    <div className="bg-modal">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h3 className="m-0 text-sm text-neutral-800">Registrar e invitar</h3>
          <button
            type="button"
            className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-full cursor-pointer inline-flex items-center justify-center"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <form className="grid gap-4 p-4" onSubmit={submit}>
          <fieldset
            className="m-0 grid min-w-0 gap-4 border-0 p-0"
            disabled={disabled}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="invite-first-names" className={label}>
                  Nombres
                </label>
                <input
                  id="invite-first-names"
                  autoComplete="given-name"
                  required
                  maxLength={100}
                  value={firstNames}
                  onChange={(event) => setFirstNames(event.target.value)}
                  className={field}
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="invite-last-names" className={label}>
                  Apellidos
                </label>
                <input
                  id="invite-last-names"
                  autoComplete="family-name"
                  required
                  maxLength={120}
                  value={lastNames}
                  onChange={(event) => setLastNames(event.target.value)}
                  className={field}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="invite-email" className={label}>
                Correo electrónico
              </label>
              <input
                id="invite-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={field}
              />
            </div>

            {selections.map((selection, index) => (
              <div className="grid gap-1.5" key={selection.key}>
                <label
                  htmlFor={`invite-area-${selection.key}`}
                  className={label}
                >
                  {index === 0 ? "Área o áreas" : `Área ${index + 1}`}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id={`invite-area-${selection.key}`}
                    required
                    value={allAreas ? "all" : selection.value}
                    onChange={(event) =>
                      changeArea(selection.key, event.target.value)
                    }
                    className={`${field} cursor-pointer`}
                  >
                    <option value="">Selecciona un área</option>
                    {index === 0 && <option value="all">Todas</option>}
                    {areas
                      .filter(
                        (area) =>
                          !selections.some(
                            (item) =>
                              item.key !== selection.key &&
                              item.value === String(area.id),
                          ),
                      )
                      .map((area) => (
                        <option value={area.id} key={area.id}>
                          {area.name}
                        </option>
                      ))}
                  </select>
                  {index > 0 && (
                    <button
                      type="button"
                      className={`${secondary} flex-none`}
                      aria-label={`Retirar área ${index + 1}`}
                      onClick={() =>
                        setSelections((current) =>
                          current.filter((item) => item.key !== selection.key),
                        )
                      }
                    >
                      Retirar
                    </button>
                  )}
                </div>
              </div>
            ))}

            {allAreas && (
              <p className="m-0 text-xs leading-relaxed text-neutral-600">
                Acceso a las áreas activas actuales y futuras, sujeto a los
                permisos y asignaciones de la cuenta.
              </p>
            )}

            {canAdd && (
              <button
                type="button"
                onClick={addArea}
                className={`${secondary} justify-self-start`}
              >
                Agregar área
              </button>
            )}

            <div className="grid gap-1.5">
              <label htmlFor="invite-role" className={label}>
                Rol global
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className={`${field} cursor-pointer`}
              >
                {accountRoles.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {areas.length === 0 && (
            <p
              className="m-0 text-xs leading-relaxed text-neutral-600"
              role="status"
            >
              No hay áreas activas disponibles para registrar cuentas.
            </p>
          )}

          <footer className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className={secondary} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
            >
              {busy ? "Registrando y enviando…" : "Registrar e invitar"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
