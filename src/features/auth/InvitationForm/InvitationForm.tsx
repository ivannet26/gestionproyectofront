import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Area } from "../api";
import { ApiError, apiRequest, errorText } from "../api";
import { accountRoles } from "../roles";
import styles from "./InvitationForm.module.css";

interface InvitationFormProps {
  areas: Area[];
  onUpdate: () => void | Promise<void>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}

interface AreaSelection {
  key: number;
  value: string;
}

interface InvitationResult {
  detail: string;
}

export default function InvitationForm({
  areas,
  onUpdate,
  onMessage,
  onError,
}: InvitationFormProps) {
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
    onError("");
    onMessage("");
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
      onMessage(result.detail);
      clearForm();
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        failure.status === 503 &&
        failure.payload?.account_id
      )
        clearForm();
      onError(errorText(failure));
    } finally {
      await onUpdate();
      setBusy(false);
    }
  }

  return (
    <form className={styles["account-form"]} onSubmit={submit}>
      <fieldset
        className={styles["invitation-fields"]}
        disabled={busy || areas.length === 0}
      >
        <div className={styles["invitation-name-grid"]}>
          <div>
            <label htmlFor="invite-first-names">Nombres</label>
            <input
              id="invite-first-names"
              autoComplete="given-name"
              required
              maxLength={100}
              value={firstNames}
              onChange={(event) => setFirstNames(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="invite-last-names">Apellidos</label>
            <input
              id="invite-last-names"
              autoComplete="family-name"
              required
              maxLength={120}
              value={lastNames}
              onChange={(event) => setLastNames(event.target.value)}
            />
          </div>
        </div>
        <label htmlFor="invite-email">Correo electrónico</label>
        <input
          id="invite-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className={styles["area-selectors"]}>
          {selections.map((selection, index) => (
            <div className={styles["area-selector"]} key={selection.key}>
              <label htmlFor={`invite-area-${selection.key}`}>
                {index === 0 ? "Área o áreas" : `Área ${index + 1}`}
              </label>
              <div className={styles["area-selector__controls"]}>
                <select
                  id={`invite-area-${selection.key}`}
                  required
                  value={allAreas ? "all" : selection.value}
                  onChange={(event) =>
                    changeArea(selection.key, event.target.value)
                  }
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
                    className={styles["secondary-button"]}
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
            <p className="field-hint">
              Acceso a las áreas activas actuales y futuras, sujeto a los
              permisos y asignaciones de la cuenta.
            </p>
          )}
          {canAdd && (
            <button
              className={`${styles["secondary-button"]} ${styles["add-area-button"]}`}
              type="button"
              onClick={addArea}
            >
              + Agregar área
            </button>
          )}
        </div>
        <label htmlFor="invite-role">Rol global</label>
        <select
          id="invite-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          {accountRoles.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button className="primary-button" type="submit">
          {busy ? "Registrando y enviando…" : "Registrar e invitar"}
        </button>
      </fieldset>
      {areas.length === 0 && (
        <p className="field-hint" role="status">
          No hay áreas activas disponibles para registrar cuentas.
        </p>
      )}
    </form>
  );
}
