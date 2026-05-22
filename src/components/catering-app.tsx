"use client";

import { ClipboardList, Refrigerator, Utensils } from "lucide-react";
import { MobileNav, Sidebar } from "@/components/nav";
import { DashboardSection } from "@/components/dashboard-section";
import { FridgeSection } from "@/components/fridge-section";
import { EventsSection } from "@/components/events-section";
import { useCateringApp } from "@/hooks/use-catering-app";
import type { Section } from "@/lib/catering-types";
import { pantryProductGroups, inventarioProductGroups } from "@/lib/catering-app-constants";

export default function CateringApp() {
  const {
    activeSection,
    addProductToEvent,
    deleteEvent,
    deleteStockMovement,
    despensaProducts,
    eventForm,
    eventProductPlanLog,
    events,
    fridgeProducts,
    handleCreateEvent,
    handleStockSubmit,
    inventoryProducts,
    nextEvent,
    nextPreparationTotal,
    returnLog,
    saveEventOperationalDraft,
    selectedEvent,
    setActiveSection,
    setEventForm,
    setManualProductStock,
    setSelectedEventId,
    setStockFeedback,
    setStockForm,
    stockFeedback,
    stockForm,
    stockMovements,
    stockTotal,
    syncStatus,
    updateEvent,
    updateEventKgPerPerson,
    updateEventKgPerPersonBySource,
    updateEventProductPlan,
    updateEventStatus,
    updateReturnEntry,
    upcomingEvents,
    visibleProducts,
  } = useCateringApp();

  function handleSectionChange(section: Section) {
    if (section === activeSection) return;
    setActiveSection(section);
    window.scrollTo(0, 0);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-zinc-950">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,245,247,0.78)_38%,rgba(229,231,235,0.72)_100%)]" />
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col md:block">
        <Sidebar
          activeSection={activeSection}
          onChange={handleSectionChange}
          syncStatus={syncStatus}
        />
        <MobileNav
          activeSection={activeSection}
          onChange={handleSectionChange}
          syncStatus={syncStatus}
        />

        <div
          key={activeSection}
          className="section-content relative z-0 min-w-0 px-4 py-4 pb-safe-nav sm:px-6 md:ml-[280px] md:px-8 md:py-8 md:pb-8"
        >
          {activeSection === "dashboard" && (
            <DashboardSection
              eventsCount={upcomingEvents.length}
              nextEvent={nextEvent}
              nextPreparationTotal={nextPreparationTotal}
              stockTotal={stockTotal}
            />
          )}

          {activeSection === "frigorifico" && (
            <FridgeSection
              eventProductPlanLog={eventProductPlanLog}
              events={events}
              eyebrow="Frigorífico"
              onDeleteStockMovement={deleteStockMovement}
              onSetManualProductStock={setManualProductStock}
              onStockFeedbackDone={() => setStockFeedback(null)}
              onStockFormChange={setStockForm}
              onStockSubmit={handleStockSubmit}
              products={fridgeProducts}
              returnLog={returnLog}
              selectedProduct={fridgeProducts.find(
                (product) => product.id === stockForm.productId,
              )}
              showProvider
              stockFeedback={stockFeedback}
              stockMovements={stockMovements}
              stockForm={stockForm}
              stockIcon={Refrigerator}
              stockTitle="Stock del frigorífico"
              subtitle="Carnes y embutidos, todo en kg."
              title="Stock actual del frigorífico"
            />
          )}

          {activeSection === "despensa" && (
            <FridgeSection
              eventProductPlanLog={eventProductPlanLog}
              events={events}
              eyebrow="Despensa"
              onDeleteStockMovement={deleteStockMovement}
              onSetManualProductStock={setManualProductStock}
              onStockFeedbackDone={() => setStockFeedback(null)}
              onStockFormChange={setStockForm}
              onStockSubmit={handleStockSubmit}
              productGroups={pantryProductGroups}
              products={despensaProducts}
              returnLog={returnLog}
              selectedProduct={despensaProducts.find(
                (product) => product.id === stockForm.productId,
              )}
              stockFeedback={stockFeedback}
              stockMovements={stockMovements}
              stockForm={stockForm}
              stockIcon={Utensils}
              stockTitle="Stock de despensa"
              subtitle="Alimentos, descartables y preparación del servicio en un solo control."
              title="Despensa"
            />
          )}

          {activeSection === "inventario" && (
            <FridgeSection
              eventProductPlanLog={eventProductPlanLog}
              events={events}
              eyebrow="Inventario"
              onDeleteStockMovement={deleteStockMovement}
              onSetManualProductStock={setManualProductStock}
              onStockFeedbackDone={() => setStockFeedback(null)}
              onStockFormChange={setStockForm}
              onStockSubmit={handleStockSubmit}
              productGroups={inventarioProductGroups}
              products={inventoryProducts}
              returnLog={returnLog}
              selectedProduct={inventoryProducts.find(
                (product) => product.id === stockForm.productId,
              )}
              stockFeedback={stockFeedback}
              stockMovements={stockMovements}
              stockForm={stockForm}
              stockIcon={ClipboardList}
              stockTitle="Inventario operativo"
              subtitle="Parrillas, utensilios, herramientas y equipos: qué hay, qué está reservado y qué falta."
              title="Inventario de equipos"
            />
          )}

          {activeSection === "eventos" && (
            <EventsSection
              eventProductPlanLog={eventProductPlanLog}
              eventForm={eventForm}
              events={events}
              onAddProductToEvent={addProductToEvent}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={deleteEvent}
              onEventFormChange={setEventForm}
              onSelectEvent={setSelectedEventId}
              onSaveEventOperationalDraft={saveEventOperationalDraft}
              onUpdateEventProductPlan={updateEventProductPlan}
              onUpdateReturnEntry={updateReturnEntry}
              onStatusChange={updateEventStatus}
              onUpdateEvent={updateEvent}
              onUpdateEventKgPerPerson={updateEventKgPerPerson}
              onUpdateEventKgPerPersonBySource={updateEventKgPerPersonBySource}
              products={visibleProducts}
              returnLog={returnLog}
              selectedEvent={selectedEvent}
              selectedEventId={selectedEvent?.id ?? ""}
            />
          )}
        </div>
      </div>
    </main>
  );
}
