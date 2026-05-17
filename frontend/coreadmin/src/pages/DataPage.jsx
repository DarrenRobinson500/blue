import { useState, useRef } from 'react'
import { getToken } from '../api'

export default function DataPage() {
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const fileRef = useRef(null)

  const download = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/core/data/export/', {
        headers: { Authorization: `Token ${getToken()}` },
      })
      if (!res.ok) throw new Error('Export failed.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeplatform_data_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const upload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadResult(null)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      const res = await fetch('/api/core/data/import/', {
        method: 'POST',
        headers: { Authorization: `Token ${getToken()}` },
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setUploadResult(data.detail || 'Import complete.')
        setSelectedFile(null)
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setUploadError(data.detail || 'Import failed.')
      }
    } catch {
      setUploadError('Network error.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-lg font-semibold text-primary mb-6">Data</h1>

      <div className="space-y-4">

        {/* Export */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-primary mb-1">Download data</h2>
          <p className="text-xs text-muted mb-4">
            Exports all platform data — risks, obligations, users, functions, projects and actuarial records — as a JSON file.
          </p>
          <button
            onClick={download}
            disabled={downloading}
            className="px-4 py-2 text-sm bg-stone-700 text-white rounded hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {downloading ? 'Preparing…' : 'Download data'}
          </button>
        </div>

        {/* Import */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-primary mb-1">Update data</h2>
          <p className="text-xs text-muted mb-1">
            Loads data from a previously exported JSON file into the database. Existing records with matching IDs will be updated; new records will be inserted.
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
            Warning: this will overwrite existing records. Make sure to download a backup first.
          </p>
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={e => { setSelectedFile(e.target.files[0] || null); setUploadResult(null); setUploadError('') }}
              className="block text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:text-xs file:text-primary file:bg-surface hover:file:bg-gray-50"
            />
            <button
              onClick={upload}
              disabled={!selectedFile || uploading}
              className="px-4 py-2 text-sm bg-stone-700 text-white rounded hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Importing…' : 'Update data'}
            </button>
            {uploadResult && <p className="text-sm text-green-600">{uploadResult}</p>}
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          </div>
        </div>

      </div>
    </div>
  )
}
