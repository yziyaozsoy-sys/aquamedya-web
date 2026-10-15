import React, { useState } from 'react';
import {
  LayoutGrid, List, Sun, Moon, Package,
  Check, CheckCircle, Play, Star
} from 'lucide-react';

function ProductImage({ src, name, Icon, listView }) {
  const [failedSrc, setFailedSrc] = useState(null);

  return (
    <div
      className={
        listView
          ? 'w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center'
          : 'h-48 w-full overflow-hidden bg-slate-100 flex items-center justify-center'
      }
    >
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className="w-full h-full object-contain"
        />
      ) : (
        <Icon size={listView ? 30 : 54} className="text-slate-400" />
      )}
    </div>
  );
}

export default function EquipmentCatalog({
  items = [],
  category = 'Tümü',
  onCategoryChange,
  categoryIcons = {},
  selectedNames = [],
  onToggleEquipment,
  onGoToRental,
  onOpenVideo,
  getImageUrl,
  formatPrice,
  theme = 'dark',
  onToggleTheme,
}) {
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('aqua_catalog_view') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const dark = theme === 'dark';
  const listView = view === 'list';
  const categories = ['Tümü', ...new Set(items.map(item => item.category).filter(Boolean))];
  const filteredItems = items.filter(item => category === 'Tümü' || item.category === category);

  const changeView = (nextView) => {
    setView(nextView);
    try {
      localStorage.setItem('aqua_catalog_view', nextView);
    } catch {
      // Depolama kapalı olsa da görünüm değişir.
    }
  };

  const surface = dark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const muted = dark ? 'text-slate-400' : 'text-slate-600';
  const inactive = dark
    ? 'text-slate-300 hover:bg-slate-800'
    : 'text-slate-600 hover:bg-slate-100';
  const active = 'bg-gradient-to-r from-blue-600 to-purple-600 text-white';

  return (
    <section className={dark ? 'text-slate-100' : 'text-slate-900'}>
      <div className="flex flex-wrap items-start justify-between gap-5 mb-6">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <Package className="text-purple-500" />
            Ekipman Kataloğu
          </h2>
          <p className={`text-sm mt-2 ${muted}`}>
            Stoktaki sinema ve prodüksiyon ekipmanlarını keşfedin,
            doğrudan kiralama sepetinize ekleyin.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div
            role="group"
            aria-label="Katalog görünümü"
            className={`inline-flex p-1 rounded-xl border ${surface}`}
          >
            <button
              type="button"
              aria-pressed={!listView}
              onClick={() => changeView('grid')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition ${!listView ? active : inactive}`}
            >
              <LayoutGrid size={16} /> Kart
            </button>
            <button
              type="button"
              aria-pressed={listView}
              onClick={() => changeView('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition ${listView ? active : inactive}`}
            >
              <List size={16} /> Liste
            </button>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold ${surface}`}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? 'Açık Tema' : 'Koyu Tema'}
          </button>
        </div>
      </div>

      {selectedNames.length > 0 && (
        <button
          type="button"
          onClick={onGoToRental}
          className={`mb-6 flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm ${active}`}
        >
          <CheckCircle size={18} />
          {selectedNames.length} Ekipman Seçildi — Talep Formuna Geç
        </button>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        {categories.map(cat => {
          const selected = cat === category;
          const Icon = categoryIcons[cat] || Package;
          const count = cat === 'Tümü'
            ? items.length
            : items.filter(item => item.category === cat).length;

          return (
            <button
              key={cat}
              type="button"
              aria-pressed={selected}
              onClick={() => onCategoryChange(cat)}
              className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl border text-xs font-bold transition ${
                selected ? `${active} border-purple-500` : `${surface} ${inactive}`
              }`}
            >
              {cat !== 'Tümü' && <Icon size={15} />}
              {cat}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                selected ? 'bg-black/20 text-white' : dark ? 'bg-slate-800' : 'bg-slate-100'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className={listView ? 'space-y-3' : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6'}>
        {filteredItems.map(eq => {
          const selected = selectedNames.includes(eq.name);
          const outOfStock = eq.stock !== undefined && eq.stock !== null && Number(eq.stock) === 0;
          const Icon = categoryIcons[eq.category] || Package;
          const specs = Array.isArray(eq.specs) ? eq.specs : [];
          const video = eq.videoUrl || eq.youtubeUrl;
          const currency = eq.currency || '₺';

          return (
            <article
              key={eq._id || eq.id}
              className={`rounded-2xl border overflow-hidden shadow-sm transition ${surface} ${
                selected ? 'ring-2 ring-purple-500' : 'hover:shadow-lg'
              } ${
                listView ? 'flex flex-wrap sm:flex-nowrap items-center gap-4 p-4' : 'flex flex-col'
              }`}
            >
              <ProductImage
                src={eq.photo ? getImageUrl(eq.photo) : ''}
                name={eq.name}
                Icon={Icon}
                listView={listView}
              />

              <div className={listView ? 'flex-1 min-w-0' : 'p-5 flex-1'}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-cyan-600">
                    {eq.category}
                  </span>
                  {eq.rating != null && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 font-bold">
                      <Star size={12} className="fill-current" />
                      {eq.rating}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base">{eq.name}</h3>

                {specs.length > 0 && (
                  <ul className={`mt-3 space-y-1.5 text-xs leading-5 ${muted}`}>
                    {specs.slice(0, listView ? 2 : 4).map((spec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-2 w-1 h-1 rounded-full bg-purple-500 shrink-0" />
                        <span className="line-clamp-1">{spec}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {video && (
                  <button
                    type="button"
                    onClick={() => onOpenVideo(eq)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-purple-500 hover:text-purple-400"
                  >
                    <Play size={14} /> Tanıtım Videosunu İzle
                  </button>
                )}
              </div>

              <div className={
                listView
                  ? 'w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-3'
                  : `p-5 border-t flex items-center justify-between gap-3 ${dark ? 'border-slate-800' : 'border-slate-200'}`
              }>
                <div className={listView ? 'sm:text-right' : ''}>
                  <p className={`text-xs mb-1 ${muted}`}>Günlük Kiralama</p>
                  <p className="text-lg font-black whitespace-nowrap">
                    {formatPrice(eq)} {currency}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onToggleEquipment(eq.name)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    outOfStock
                      ? dark
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : selected
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : `${active} hover:opacity-90`
                  }`}
                >
                  {outOfStock ? 'Stokta Yok' : selected ? <><Check size={14} /> Seçildi</> : 'Sepete Ekle'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className={`text-center py-16 rounded-2xl border ${surface}`}>
          <Package size={40} className={`mx-auto mb-3 ${muted}`} />
          <p className={`text-sm ${muted}`}>
            "{category}" kategorisinde henüz ekipman bulunmuyor.
          </p>
          <button
            type="button"
            onClick={() => onCategoryChange('Tümü')}
            className="mt-4 text-xs font-bold text-purple-500 hover:underline"
          >
            Tüm Ekipmanları Göster
          </button>
        </div>
      )}
    </section>
  );
}