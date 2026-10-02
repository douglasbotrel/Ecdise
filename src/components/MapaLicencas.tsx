'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Ícones por tipo de licença — um "pin" em formato de gota (como o marcador
// padrão), mas com cor e emoji diferentes: verde com 🌾 para Atividade
// (licença ambiental rural) e azul com 💧 para Outorga (uso de água).
// Usa divIcon (HTML/CSS puro) em vez de imagem, então não depende de
// nenhuma rede externa pra carregar o ícone.
function criarIconePin(emoji: string, cor: string) {
  return L.divIcon({
    html: `
      <div style="
        width: 30px; height: 30px;
        background: ${cor};
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 1px 4px rgba(0,0,0,0.45);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${emoji}</span>
      </div>
    `,
    className: '', // evita o fundo/quadrado branco padrão do Leaflet
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  })
}

const iconeAtividade = criarIconePin('🌾', '#16a34a') // verde — licença ambiental / atividade rural
const iconeOutorga   = criarIconePin('💧', '#0284c7') // azul — outorga de uso de água

function iconePorTipo(tipo: string | null | undefined) {
  return tipo === 'OUTORGA' ? iconeOutorga : iconeAtividade
}

function formatData(d: string | Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

// Ajusta o zoom/centro pra caber todos os marcadores na tela
function AjustarAosMarcadores({ pontos }: { pontos: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (pontos.length === 0) return
    if (pontos.length === 1) {
      map.setView(pontos[0], 15)
    } else {
      map.fitBounds(L.latLngBounds(pontos), { padding: [40, 40] })
    }
  }, [pontos, map])
  return null
}

export default function MapaLicencas({ licencas }: { licencas: any[] }) {
  const comCoordenadas = licencas.filter(l => l.latitude != null && l.longitude != null)
  const pontos: [number, number][] = comCoordenadas.map(l => [l.latitude, l.longitude])
  const centroInicial: [number, number] = pontos[0] || [-5.5, -45.2] // fallback: Maranhão

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '520px' }}>
      <MapContainer center={centroInicial} zoom={7} style={{ height: '100%', width: '100%' }}>
        {/* Camada de satélite — Esri World Imagery, gratuita, sem chave de API */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
          maxZoom={19}
        />
        <AjustarAosMarcadores pontos={pontos} />
        {comCoordenadas.map(l => (
          <Marker key={l.id} position={[l.latitude, l.longitude]} icon={iconePorTipo(l.tipo)}>
            <Popup>
              <div className="text-sm min-w-[180px]">
                <p className="font-semibold text-gray-900">
                  {l.tipo === 'OUTORGA' ? '💧 Outorga' : '🌾 Atividade'} nº {l.numero}
                </p>
                <p className="text-gray-600">{l.cliente?.nome || l.projeto?.cliente?.nome || '—'}</p>
                {l.projeto?.imovelNome && <p className="text-gray-500 text-xs">{l.projeto.imovelNome}</p>}
                <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                  <p>Emitida: {formatData(l.dataEmissao)}</p>
                  <p>Válida até: {formatData(l.dataValidade)}</p>
                  {l.tipo === 'OUTORGA' ? (
                    <>
                      {l.vazao != null && <p>Vazão: {l.vazao} m³/h</p>}
                      {l.tipoOutorga && <p>Tipo: {l.tipoOutorga}</p>}
                    </>
                  ) : (
                    <>
                      {l.areaPermitida != null && <p>Área: {l.areaPermitida} ha</p>}
                      {l.atividadePermitida && <p>Atividade: {l.atividadePermitida}</p>}
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
