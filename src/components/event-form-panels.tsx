"use client";

import { type FormEvent, useState } from "react";
import dynamic from "next/dynamic";
import type { LocationResult } from "./location-picker";
import { ExternalLink, Link2, MapPin, Pencil, Plus, Save, X } from "lucide-react";
import type { CateringEvent, EventServiceType, EventStatus } from "@/lib/catering-data";
import { recipeConfigs } from "@/lib/catering-data";
import { getDefaultKgPerPerson } from "@/lib/catering-calculations";
import { formatAmountInputValue, normalizeAmountDraft } from "@/lib/form-utils";
import { editableEventStatuses, eventStatusCopy } from "@/lib/catering-app-constants";
import type { EventForm } from "@/lib/catering-types";
import { DateField, Field, SectionTitle, TimeField } from "@/components/ui/primitives";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false });

export function CreateEventPanel({
  eventForm,
  onClose,
  onFormChange,
  onSubmit,
}: {
  eventForm: EventForm;
  onClose: () => void;
  onFormChange: (form: EventForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  return (
    <div
      className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 px-4 py-6 backdrop-blur-sm md:left-[280px]"
      onClick={onClose}
    >
      <div
        className="app-modal-panel max-h-full w-full max-w-[520px] overflow-y-auto rounded-[8px] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(39,39,42,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <SectionTitle icon={Plus} title="Crear evento" subtitle="Nuevo servicio" />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
            aria-label="Cerrar creación"
            title="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Field label="Nombre del evento">
            <input
              type="text"
              value={eventForm.name}
              onChange={(event) => onFormChange({ ...eventForm, name: event.target.value })}
              placeholder="Cena para 60 personas"
              className="field-control"
              required
            />
          </Field>
          <Field label="Encargado">
            <input
              type="text"
              value={eventForm.manager}
              onChange={(event) => onFormChange({ ...eventForm, manager: event.target.value })}
              placeholder="Nombre del responsable"
              className="field-control"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fecha">
              <DateField
                value={eventForm.date}
                onChange={(value) => onFormChange({ ...eventForm, date: value })}
              />
            </Field>
            <Field label="Hora">
              <TimeField
                value={eventForm.time}
                onChange={(value) => onFormChange({ ...eventForm, time: value })}
              />
            </Field>
            <Field label="Personas">
              <input
                type="number"
                min="1"
                value={eventForm.people}
                onChange={(event) => onFormChange({ ...eventForm, people: event.target.value })}
                className="field-control"
                required
              />
            </Field>
          </div>
          <Field label="Ubicación">
            <div className="flex flex-col gap-2">
              {!eventForm.location.trim() && !showLinkInput && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(true); }}
                    className="flex items-center justify-center gap-2 rounded-[12px] border border-zinc-200 bg-white py-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                    Pegar link de Maps
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowLocationPicker(true); }}
                    className="flex items-center justify-center gap-2 rounded-[12px] border border-zinc-200 bg-white py-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#8f2f2b]" />
                    Marcar en mapa
                  </button>
                </div>
              )}
              {!eventForm.location.trim() && showLinkInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={eventForm.location}
                    onChange={(event) =>
                      onFormChange({ ...eventForm, location: event.target.value, locationLat: null, locationLng: null })
                    }
                    placeholder="Pegá el link de Google Maps…"
                    className="field-control flex-1"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowLinkInput(false);
                      onFormChange({ ...eventForm, location: "", locationLat: null, locationLng: null });
                    }}
                    className="flex shrink-0 items-center rounded-[8px] border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
                    title="Cancelar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {eventForm.location.trim() && (() => {
                const mapsUrl = eventForm.locationLat !== null && eventForm.locationLng !== null
                  ? `https://maps.google.com/?q=${eventForm.locationLat},${eventForm.locationLng}`
                  : `https://maps.google.com/?q=${encodeURIComponent(eventForm.location.trim())}`;
                return (
                  <div className="rounded-[12px] border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8f2f2b]" />
                      <span className="flex-1 text-xs text-zinc-500 line-clamp-2">{eventForm.location}</span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onFormChange({ ...eventForm, location: "", locationLat: null, locationLng: null });
                          setShowLinkInput(false);
                        }}
                        className="shrink-0 text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#8f2f2b] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{mapsUrl}</span>
                    </a>
                  </div>
                );
              })()}
            </div>
          </Field>
          {showLocationPicker && (
            <LocationPicker
              initial={eventForm.location}
              onConfirm={(result: LocationResult) => {
                onFormChange({ ...eventForm, location: result.name, locationLat: result.lat, locationLng: result.lng });
                setShowLocationPicker(false);
              }}
              onClose={() => setShowLocationPicker(false)}
            />
          )}
          <Field label="Tipo de servicio">
            <select
              value={eventForm.serviceType}
              onChange={(event) => onFormChange({ ...eventForm, serviceType: event.target.value as EventServiceType })}
              className="field-control"
            >
              {recipeConfigs.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={eventForm.status}
              onChange={(event) => onFormChange({ ...eventForm, status: event.target.value as EventStatus })}
              className="field-control"
            >
              {editableEventStatuses.map((status) => (
                <option key={status} value={status}>{eventStatusCopy[status]}</option>
              ))}
            </select>
          </Field>
          <Field label="Observaciones">
            <textarea
              value={eventForm.notes}
              onChange={(event) => onFormChange({ ...eventForm, notes: event.target.value })}
              placeholder="Dirección, hora, responsable, pedidos especiales..."
              className="field-control notes-textarea"
            />
          </Field>
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#8f2f2b] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(143,47,43,0.24)] transition hover:bg-[#7d2926]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Crear evento
          </button>
        </form>
      </div>
    </div>
  );
}

export function EditEventPanel({
  editingEvent,
  editingEventId,
  editEventForm,
  onClose,
  onFormChange,
  onSubmit,
}: {
  editingEvent: CateringEvent | undefined;
  editingEventId: string | null;
  editEventForm: EventForm;
  onClose: () => void;
  onFormChange: (form: EventForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!editingEventId) return null;

  return (
    <div
      className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 px-4 py-6 backdrop-blur-sm md:left-[280px]"
      onClick={onClose}
    >
      <div
        className="app-modal-panel max-h-full w-full max-w-[520px] overflow-y-auto rounded-[8px] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(39,39,42,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <SectionTitle icon={Pencil} title="Editar evento" subtitle={editingEvent?.name ?? "Servicio cargado"} />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
            aria-label="Cerrar edición"
            title="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Field label="Nombre del evento">
            <input
              type="text"
              value={editEventForm.name}
              onChange={(event) => onFormChange({ ...editEventForm, name: event.target.value })}
              placeholder="Cena para 60 personas"
              className="field-control"
              required
            />
          </Field>
          <Field label="Encargado">
            <input
              type="text"
              value={editEventForm.manager}
              onChange={(event) => onFormChange({ ...editEventForm, manager: event.target.value })}
              placeholder="Nombre del responsable"
              className="field-control"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fecha">
              <DateField
                value={editEventForm.date}
                onChange={(value) => onFormChange({ ...editEventForm, date: value })}
              />
            </Field>
            <Field label="Hora">
              <TimeField
                value={editEventForm.time}
                onChange={(value) => onFormChange({ ...editEventForm, time: value })}
              />
            </Field>
            <Field label="Personas">
              <input
                type="number"
                min="1"
                value={editEventForm.people}
                onChange={(event) => onFormChange({ ...editEventForm, people: event.target.value })}
                className="field-control"
                required
              />
            </Field>
          </div>
          <Field label="Ubicación">
            <input
              type="text"
              value={editEventForm.location}
              onChange={(event) =>
                onFormChange({ ...editEventForm, location: event.target.value, locationLat: null, locationLng: null })
              }
              placeholder="Dirección o link de Google Maps"
              className="field-control"
            />
          </Field>
          <Field label="Tipo de servicio">
            <select
              value={editEventForm.serviceType}
              onChange={(event) =>
                onFormChange({ ...editEventForm, serviceType: event.target.value as EventServiceType })
              }
              className="field-control"
            >
              {recipeConfigs.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Kg/persona">
            <input
              type="text"
              inputMode="decimal"
              value={editEventForm.kgPerPerson}
              onChange={(event) =>
                onFormChange({ ...editEventForm, kgPerPerson: normalizeAmountDraft(event.target.value) })
              }
              placeholder={`Estándar ${formatAmountInputValue(getDefaultKgPerPerson(editEventForm.serviceType))}`}
              className="field-control"
            />
          </Field>
          <Field label="Estado">
            <select
              value={editEventForm.status}
              onChange={(event) =>
                onFormChange({ ...editEventForm, status: event.target.value as EventStatus })
              }
              className="field-control"
            >
              {editableEventStatuses.map((status) => (
                <option key={status} value={status}>{eventStatusCopy[status]}</option>
              ))}
            </select>
          </Field>
          <Field label="Observaciones">
            <textarea
              value={editEventForm.notes}
              onChange={(event) => onFormChange({ ...editEventForm, notes: event.target.value })}
              placeholder="Dirección, hora, responsable, pedidos especiales..."
              className="field-control notes-textarea"
            />
          </Field>
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#8f2f2b] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(143,47,43,0.24)] transition hover:bg-[#7d2926]"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Guardar cambios
          </button>
        </form>
      </div>
    </div>
  );
}
