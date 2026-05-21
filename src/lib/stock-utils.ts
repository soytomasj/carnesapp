import { ChefHat, ClipboardList, PackageCheck } from "lucide-react";
import type { CateringEvent, EventServiceType, EventStatus, Product } from "@/lib/catering-data";
import type { StockMovement, StockProductGroup } from "@/lib/catering-types";

export function groupStockProducts(
  products: Product[],
  groups?: StockProductGroup[],
): Array<StockProductGroup & { products: Product[] }> {
  if (!groups || groups.length === 0) {
    return [
      {
        description: "",
        icon: PackageCheck,
        id: "todos",
        label: "Productos",
        productIds: products.map((product) => product.id),
        products,
      },
    ];
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const assignedProductIds = new Set<string>();
  const groupedProducts = groups
    .map((group) => {
      const groupProducts = group.productIds
        .map((productId) => productById.get(productId))
        .filter((product): product is Product => Boolean(product));

      groupProducts.forEach((product) => assignedProductIds.add(product.id));

      return {
        ...group,
        products: groupProducts,
      };
    })
    .filter((group) => group.products.length > 0);
  const otherProducts = products.filter(
    (product) => !assignedProductIds.has(product.id),
  );

  if (otherProducts.length > 0) {
    groupedProducts.push({
      description: "Productos pendientes de clasificar.",
      icon: PackageCheck,
      id: "otros",
      label: "Otros",
      productIds: otherProducts.map((product) => product.id),
      products: otherProducts,
    });
  }

  return groupedProducts;
}

export function getMovementEventInfo(
  movement: StockMovement,
  events: CateringEvent[],
):
  | {
      date: string;
      name: string;
      serviceType: EventServiceType;
      status: EventStatus;
    }
  | null {
  if (
    movement.eventDate &&
    movement.eventName &&
    movement.eventStatus &&
    movement.serviceType
  ) {
    return {
      date: movement.eventDate,
      name: movement.eventName,
      serviceType: movement.serviceType,
      status: movement.eventStatus,
    };
  }

  const eventName = movement.note
    .replace(/^Salida por evento:\s*/i, "")
    .replace(/^Evento:\s*/i, "")
    .trim();
  const matchedEvent = events.find(
    (event) => event.name.toLowerCase() === eventName.toLowerCase(),
  );

  if (!matchedEvent || eventName === movement.note.trim()) {
    return null;
  }

  return {
    date: matchedEvent.date,
    name: matchedEvent.name,
    serviceType: matchedEvent.serviceType,
    status: matchedEvent.status,
  };
}

export function formatEventNameDisplay(value: string): string {
  return value.trim().toLocaleUpperCase("es-PY");
}

export function formatPersonName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es-PY")
    .replace(/(^|\s)(\p{L})/gu, (match) => match.toLocaleUpperCase("es-PY"));
}

export function formatStockMovementNote(movement: StockMovement): string {
  if (movement.provider) {
    return `Proveedor: ${movement.provider}`;
  }

  if (movement.note.startsWith("Retorno evento:")) {
    return `Volvió al frigorífico: ${formatEventNameDisplay(
      movement.note.replace(/^Retorno evento:\s*/i, ""),
    )}`;
  }

  if (movement.note.startsWith("Evento:")) {
    return `Llevado al evento: ${formatEventNameDisplay(
      movement.note.replace(/^Evento:\s*/i, ""),
    )}`;
  }

  if (movement.note === "Ingreso manual") {
    return "Entrada de stock";
  }

  return movement.note;
}

export function getStockBadge(
  availableStock: number,
): { className: string; label: string } | null {
  if (availableStock <= 0) {
    return {
      className: "border-red-200 bg-red-50 text-red-700",
      label: "Sin stock",
    };
  }

  if (availableStock <= 5) {
    return {
      className: "border-amber-200 bg-amber-50 text-amber-800",
      label: "Bajo stock",
    };
  }

  return null;
}

export function getProductVisual(
  product: Product,
):
  | { type: "image"; src: string; alt: string }
  | { type: "icon"; Icon: typeof ChefHat } {
  if (product.id === "muslo-pollo") {
    return { type: "image", src: "/fridge-icons/chicken-leg.png", alt: "Muslo de pollo" };
  }
  if (product.id === "corazon-pollo") {
    return { type: "image", src: "/fridge-icons/chicken-heart.png", alt: "Corazón de pollo" };
  }
  if (product.id === "costilla" || product.id === "costilla-cerdo") {
    return { type: "image", src: "https://cdn.pixabay.com/photo/2014/12/21/23/24/spare-ribs-575310_1280.png", alt: "Costilla" };
  }
  if (product.id === "matambrito-cerdo") {
    return { type: "image", src: "/fridge-icons/pork-cut.png", alt: "Matambrito de cerdo" };
  }
  if (product.id === "morcilla") {
    return { type: "image", src: "/fridge-icons/morcilla.webp", alt: "Morcilla" };
  }
  if (product.category === "Carnes") {
    return { type: "image", src: "/fridge-icons/cut-of-meat.png", alt: "Carne" };
  }
  if (product.category === "Embutidos") {
    return { type: "image", src: "/fridge-icons/sausage.png", alt: "Chorizo" };
  }
  if (product.id === "sal") {
    return { type: "image", src: "https://cdn-icons-png.flaticon.com/512/10755/10755759.png", alt: "Sal" };
  }
  if (product.id === "leche-condensada") {
    return { type: "image", src: "https://png.pngtree.com/png-vector/20250217/ourmid/pngtree-condensed-milk-or-cream-white-sauce-pouring-from-spoon-on-transparent-png-image_15506673.png", alt: "Leche condensada" };
  }
  if (product.id === "canela") {
    return { type: "image", src: "https://png.pngtree.com/png-clipart/20240321/original/pngtree-cinnamon-sticks-illustration-png-image_14639470.png", alt: "Canela" };
  }
  if (product.id === "mbeju") {
    return { type: "image", src: "https://marketplace.canva.com/TOsEk/MAF2mETOsEk/1/tl/canva-tapioca-brazil-food-illustration-MAF2mETOsEk.png", alt: "Mbeju" };
  }
  if (product.id === "piña") {
    return { type: "image", src: "https://em-content.zobj.net/source/apple/325/pineapple_1f34d.png", alt: "Piña" };
  }
  if (product.id === "pan-de-ajo") {
    return { type: "image", src: "/fridge-icons/bread.webp", alt: "Pan de ajo" };
  }
  if (product.id === "carbon") {
    return { type: "image", src: "/fridge-icons/coal.png", alt: "Bolsa Carbón" };
  }
  if (product.id === "mandioca") {
    return { type: "image", src: "/fridge-icons/mandioca.png", alt: "Mandioca" };
  }
  if (product.id === "sopa") {
    return { type: "image", src: "/fridge-icons/sopa-paraguaya.png", alt: "Sopa paraguaya" };
  }
  if (["parrillitas", "parrilla-giragrill", "parrilla-convencional", "fogonero", "asador-en-cruz"].includes(product.id)) {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png", alt: "Parrilla" };
  }
  if (product.id === "espadines") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f362.png", alt: "Espadines" };
  }
  if (["palitas", "atizadores"].includes(product.id)) {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f527.png", alt: "Herramienta" };
  }
  if (product.id === "toldo") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26fa.png", alt: "Toldo" };
  }
  if (product.id === "mesas") {
    return { type: "image", src: "https://static.vecteezy.com/system/resources/thumbnails/042/053/010/small/ai-generated-wooden-table-hand-drawn-cartoon-style-illustration-free-png.png", alt: "Mesas" };
  }
  if (product.id === "triple") {
    return { type: "image", src: "https://png.pngtree.com/png-vector/20241105/ourmid/pngtree-portable-travel-adapter-with-dual-plug-options-suitable-for-global-and-png-image_14276109.png", alt: "Triple" };
  }
  if (product.id === "alargue") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f50c.png", alt: "Electricidad" };
  }
  if (["focos", "portafoco"].includes(product.id)) {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4a1.png", alt: "Luz" };
  }
  if (product.id === "tablas-de-picar") {
    return { type: "image", src: "https://png.pngtree.com/png-clipart/20241215/original/pngtree-wooden-cutting-board-png-image_17861693.png", alt: "Tabla de picar" };
  }
  if (["bandejas-metalicas", "bandeja-espeto"].includes(product.id)) {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f37d.png", alt: "Bandeja" };
  }
  if (["cuchillo-espeto", "cuchillo-largo", "cuchillo-de-mesa"].includes(product.id)) {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f52a.png", alt: "Cuchillo" };
  }
  if (["tenedor-espeto", "tenedor-largo"].includes(product.id)) {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f374.png", alt: "Tenedor" };
  }
  if (["cucharas", "cucharas-anchas"].includes(product.id)) {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f944.png", alt: "Cuchara" };
  }
  if (product.id === "pailas") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f373.png", alt: "Paila" };
  }
  if (product.id === "pinzas") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f962.png", alt: "Pinzas" };
  }
  if (product.id === "bandeja-isopor") {
    return { type: "image", src: "https://png.pngtree.com/png-vector/20240530/ourmid/pngtree-white-empty-blank-styrofoam-plastic-food-tray-png-image_12551911.png", alt: "Bandeja de isopor" };
  }
  if (product.id === "caja-negra") {
    return { type: "image", src: "https://inplastic.mx/wp-content/uploads/2025/02/10_04_2024_06_15_03_491___VEU0035.006.png", alt: "Caja negra" };
  }
  if (product.id === "trapos") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9f9.png", alt: "Trapos" };
  }
  if (product.id === "delantales") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f97c.png", alt: "Delantales" };
  }
  if (product.id === "bachas") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1faa3.png", alt: "Bachas" };
  }
  if (["escarbadientes-cortos", "escarbadientes-largos"].includes(product.id)) {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9b7.png", alt: "Escarbadientes" };
  }
  if (product.id === "servilletas") {
    return { type: "image", src: "https://png.pngtree.com/png-vector/20240716/ourmid/pngtree-sophisticated-folded-napkin-design-for-formal-event-png-image_13120508.png", alt: "Servilletas" };
  }
  if (product.id === "stickers") {
    return { type: "image", src: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3f7.png", alt: "Stickers" };
  }
  if (product.category === "Inventario") {
    return { type: "icon", Icon: ClipboardList };
  }
  if (product.category === "Despensa") {
    return { type: "icon", Icon: PackageCheck };
  }

  return { type: "icon", Icon: ChefHat };
}
