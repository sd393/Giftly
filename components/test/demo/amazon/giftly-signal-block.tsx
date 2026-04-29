import { Sparkles } from 'lucide-react'

import { PRODUCT_SUMMARY } from '../lib/mock-data'

export function GiftlySignalBlock() {
  return (
    <div className="rounded-md border border-[#E3F1E5] bg-[#F4FAF4] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles
          className="size-4 text-[#2D7A3F]"
          aria-hidden="true"
        />
        <p className="text-[0.78rem] font-bold text-[#0F1111]">
          Giftly signal
        </p>
      </div>
      <p className="text-[0.78rem] text-[#0F1111] leading-[1.45] mb-3">
        47 unpaid creators received samples of three competing products with
        no obligation to post.
      </p>

      <table className="w-full text-[0.75rem] border-collapse">
        <thead>
          <tr className="text-left">
            <th className="font-medium text-[#565959] pb-1">Product</th>
            <th className="font-medium text-[#565959] pb-1 text-right">
              Post rate
            </th>
            <th className="font-medium text-[#565959] pb-1 text-right">
              Sentiment
            </th>
          </tr>
        </thead>
        <tbody>
          {PRODUCT_SUMMARY.map((p) => (
            <tr
              key={p.id}
              className="border-t border-[#E3F1E5] last:border-b last:border-[#E3F1E5]"
            >
              <td
                className={
                  'py-1 ' +
                  (p.isFeatured
                    ? 'font-bold text-[#0F1111]'
                    : 'text-[#0F1111]')
                }
              >
                {p.id === 'lumina-pro'
                  ? 'Lumina Pro'
                  : p.id === 'scalprx'
                    ? 'ScalpRX'
                    : 'DermaKlear'}
              </td>
              <td className="py-1 text-right tabular-nums">
                {Math.round(p.postRate * 1000) / 10}%
              </td>
              <td className="py-1 text-right tabular-nums">
                {p.avgSentiment.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
