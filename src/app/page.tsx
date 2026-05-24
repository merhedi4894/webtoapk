'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Smartphone, Globe, Palette, ImageIcon, Timer, Settings,
  Shield, Upload, Download, Loader2, CheckCircle2,
  AlertCircle, RefreshCw, ChevronRight, Package,
  MonitorSmartphone, Navigation, Camera, MapPin,
  HardDrive, Bell, Eye, FileCode, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

interface BuildConfig {
  appName: string
  packageName: string
  websiteUrl: string
  backgroundColor: string
  splashText: string
  splashDuration: number
  iconFile: File | null
  orientation: string
  themeMode: string
  enableNavbar: boolean
  enablePullRefresh: boolean
  enableFileAccess: boolean
  enableCamera: boolean
  enableLocation: boolean
  enableStorage: boolean
  enableNotifications: boolean
  customUserAgent: string
}

interface BuildResult {
  id: string
  status: string
  apkPath: string
  buildLog: string
}

const initialConfig: BuildConfig = {
  appName: '',
  packageName: '',
  websiteUrl: '',
  backgroundColor: '#6366F1',
  splashText: '',
  splashDuration: 3000,
  iconFile: null,
  orientation: 'unspecified',
  themeMode: 'light',
  enableNavbar: true,
  enablePullRefresh: false,
  enableFileAccess: false,
  enableCamera: false,
  enableLocation: false,
  enableStorage: false,
  enableNotifications: false,
  customUserAgent: '',
}

export default function Home() {
  const [config, setConfig] = useState<BuildConfig>(initialConfig)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildProgress, setBuildProgress] = useState(0)
  const [buildStep, setBuildStep] = useState('')
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null)
  const [builds, setBuilds] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('create')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleIconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)')
      return
    }
    const img = new Image()
    img.onload = () => {
      if (img.width < 512 || img.height < 512) {
        toast.warning(`Icon is ${img.width}x${img.height}. Recommended: 512x512 pixels.`)
      }
    }
    img.src = URL.createObjectURL(file)

    const reader = new FileReader()
    reader.onload = (ev) => {
      setIconPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
    setConfig(prev => ({ ...prev, iconFile: file }))
    toast.success('App icon uploaded successfully!')
  }, [])

  const generatePackageName = (appName: string) => {
    if (!appName) return ''
    const cleaned = appName.toLowerCase().replace(/[^a-z0-9]/g, '')
    return `com.webtoapk.${cleaned}`
  }

  const handleBuild = async () => {
    if (!config.appName.trim()) {
      toast.error('App name is required!')
      return
    }
    if (!config.packageName.trim()) {
      toast.error('Package name is required!')
      return
    }
    if (!config.websiteUrl.trim()) {
      toast.error('Website URL is required!')
      return
    }
    if (!config.websiteUrl.startsWith('http://') && !config.websiteUrl.startsWith('https://')) {
      toast.error('Website URL must start with http:// or https://')
      return
    }

    setIsBuilding(true)
    setBuildProgress(0)
    setBuildStep('Preparing build environment...')
    setBuildResult(null)

    try {
      const formData = new FormData()
      formData.append('appName', config.appName)
      formData.append('packageName', config.packageName)
      formData.append('websiteUrl', config.websiteUrl)
      formData.append('backgroundColor', config.backgroundColor)
      formData.append('splashText', config.splashText)
      formData.append('splashDuration', config.splashDuration.toString())
      formData.append('orientation', config.orientation)
      formData.append('themeMode', config.themeMode)
      formData.append('enableNavbar', config.enableNavbar.toString())
      formData.append('enablePullRefresh', config.enablePullRefresh.toString())
      formData.append('enableFileAccess', config.enableFileAccess.toString())
      formData.append('enableCamera', config.enableCamera.toString())
      formData.append('enableLocation', config.enableLocation.toString())
      formData.append('enableStorage', config.enableStorage.toString())
      formData.append('enableNotifications', config.enableNotifications.toString())
      formData.append('customUserAgent', config.customUserAgent)
      if (config.iconFile) {
        formData.append('icon', config.iconFile)
      }

      const steps = [
        { progress: 10, step: 'Uploading configuration...' },
        { progress: 25, step: 'Generating Android project...' },
        { progress: 40, step: 'Compiling resources with AAPT2...' },
        { progress: 55, step: 'Compiling Java source code...' },
        { progress: 70, step: 'Converting to DEX format...' },
        { progress: 80, step: 'Packaging APK...' },
        { progress: 90, step: 'Signing APK with keystore...' },
        { progress: 95, step: 'Verifying APK integrity...' },
      ]

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setBuildProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 2
        })
      }, 800)

      for (const s of steps) {
        setBuildStep(s.step)
        await new Promise(r => setTimeout(r, 300))
      }

      const response = await fetch('/api/build', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Build failed')
      }

      const result = await response.json()
      setBuildProgress(100)
      setBuildStep('Build completed successfully!')
      setBuildResult(result)
      toast.success('APK built successfully! Ready for download.')

      // Refresh builds list
      fetchBuilds()
    } catch (error: any) {
      setBuildProgress(0)
      setBuildStep('Build failed!')
      toast.error(error.message || 'Failed to build APK')
    } finally {
      setIsBuilding(false)
    }
  }

  const fetchBuilds = async () => {
    try {
      const res = await fetch('/api/builds')
      if (res.ok) {
        const data = await res.json()
        setBuilds(data.builds || [])
      }
    } catch {}
  }

  const handleDownload = (buildId: string, appName: string) => {
    window.open(`/api/download?id=${buildId}`, '_blank')
  }

  const handleDelete = async (buildId: string) => {
    try {
      const res = await fetch(`/api/build?id=${buildId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Build deleted successfully')
        fetchBuilds()
      }
    } catch {
      toast.error('Failed to delete build')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                WebToAPK
              </h1>
              <p className="text-xs text-slate-500">Website → Android App Converter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              <Shield className="w-3 h-3 mr-1" />
              Play Store Ready
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-slate-100">
            <TabsTrigger value="create" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Package className="w-4 h-4 mr-2" />
              Create APK
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm" onClick={fetchBuilds}>
              <FileCode className="w-4 h-4 mr-2" />
              Build History
            </TabsTrigger>
          </TabsList>

          {/* Create APK Tab */}
          <TabsContent value="create" className="space-y-6">
            {/* Hero Section */}
            <div className="text-center space-y-3 py-4">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium border border-emerald-100">
                <Globe className="w-4 h-4" />
                Convert any website to an Android app
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Website to APK in Minutes
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                Transform your website into a Play Store ready Android app with custom branding,
                splash screen, icons, and professional features.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <Card className="border-slate-200/80 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      Basic Information
                    </CardTitle>
                    <CardDescription>Enter your website and app details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="websiteUrl" className="text-sm font-medium">
                        Website URL <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="websiteUrl"
                          placeholder="https://your-website.com"
                          value={config.websiteUrl}
                          onChange={(e) => setConfig(prev => ({ ...prev, websiteUrl: e.target.value }))}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="appName" className="text-sm font-medium">
                          App Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="appName"
                          placeholder="My Awesome App"
                          value={config.appName}
                          onChange={(e) => {
                            const name = e.target.value
                            setConfig(prev => ({
                              ...prev,
                              appName: name,
                              packageName: prev.packageName || generatePackageName(name)
                            }))
                          }}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="packageName" className="text-sm font-medium">
                          Package Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="packageName"
                          placeholder="com.example.myapp"
                          value={config.packageName}
                          onChange={(e) => setConfig(prev => ({ ...prev, packageName: e.target.value }))}
                          className="h-11 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Appearance */}
                <Card className="border-slate-200/80 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Palette className="w-4 h-4 text-purple-600" />
                      </div>
                      Appearance & Branding
                    </CardTitle>
                    <CardDescription>Customize your app look and feel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Background Color</Label>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              type="color"
                              value={config.backgroundColor}
                              onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                              className="w-12 h-11 rounded-lg cursor-pointer border-2 border-slate-200 p-0.5"
                            />
                          </div>
                          <Input
                            value={config.backgroundColor}
                            onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                            className="h-11 font-mono text-sm flex-1"
                            maxLength={7}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Theme Mode</Label>
                        <Select value={config.themeMode} onValueChange={(v) => setConfig(prev => ({ ...prev, themeMode: v }))}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="auto">Auto (System)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="orientation" className="text-sm font-medium">Screen Orientation</Label>
                        <Select value={config.orientation} onValueChange={(v) => setConfig(prev => ({ ...prev, orientation: v }))}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unspecified">Auto Rotate</SelectItem>
                            <SelectItem value="portrait">Portrait Only</SelectItem>
                            <SelectItem value="landscape">Landscape Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Show Navigation Bar</Label>
                        <div className="flex items-center gap-3 h-11">
                          <Switch
                            checked={config.enableNavbar}
                            onCheckedChange={(v) => setConfig(prev => ({ ...prev, enableNavbar: v }))}
                          />
                          <span className="text-sm text-slate-600">{config.enableNavbar ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>

                    {/* App Icon Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        App Icon <span className="text-slate-400 font-normal">(512x512 px recommended)</span>
                      </Label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all duration-200"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleIconUpload}
                        />
                        {iconPreview ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-20 h-20 rounded-2xl shadow-lg overflow-hidden border-2 border-white">
                              <img src={iconPreview} alt="App icon preview" className="w-full h-full object-cover" />
                            </div>
                            <p className="text-sm text-slate-500">Click to change icon</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                              <Upload className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">Click to upload app icon</p>
                            <p className="text-xs text-slate-400">PNG, JPG, WEBP (512x512 px recommended)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Splash Screen */}
                <Card className="border-slate-200/80 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Timer className="w-4 h-4 text-amber-600" />
                      </div>
                      Splash Screen
                    </CardTitle>
                    <CardDescription>Configure the launch splash screen</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="splashText" className="text-sm font-medium">Splash Screen Text</Label>
                      <Input
                        id="splashText"
                        placeholder="My Awesome App"
                        value={config.splashText}
                        onChange={(e) => setConfig(prev => ({ ...prev, splashText: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="splashDuration" className="text-sm font-medium">Splash Duration (ms)</Label>
                        <Badge variant="outline" className="font-mono">{config.splashDuration}ms</Badge>
                      </div>
                      <Input
                        id="splashDuration"
                        type="number"
                        min={500}
                        max={10000}
                        step={500}
                        value={config.splashDuration}
                        onChange={(e) => setConfig(prev => ({ ...prev, splashDuration: parseInt(e.target.value) || 3000 }))}
                        className="h-11"
                      />
                      <p className="text-xs text-slate-400">Recommended: 2000-3000ms for best user experience</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Permissions & Features */}
                <Card className="border-slate-200/80 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-red-600" />
                      </div>
                      Permissions & Features
                    </CardTitle>
                    <CardDescription>Configure app permissions and advanced features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'enablePullRefresh', label: 'Pull to Refresh', icon: RefreshCw, desc: 'Refresh webpage on pull down' },
                        { key: 'enableFileAccess', label: 'File Access', icon: HardDrive, desc: 'Upload & download files' },
                        { key: 'enableCamera', label: 'Camera Access', icon: Camera, desc: 'Use device camera' },
                        { key: 'enableLocation', label: 'Location Access', icon: MapPin, desc: 'GPS & location services' },
                        { key: 'enableStorage', label: 'Storage Access', icon: HardDrive, desc: 'Read/write storage' },
                        { key: 'enableNotifications', label: 'Push Notifications', icon: Bell, desc: 'Send notifications' },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                            (config as any)[item.key]
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : 'border-slate-100 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className={`w-4 h-4 ${(config as any)[item.key] ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <div>
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs text-slate-400">{item.desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={(config as any)[item.key]}
                            onCheckedChange={(v) => setConfig(prev => ({ ...prev, [item.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-2">
                      <Label htmlFor="customUserAgent" className="text-sm font-medium">Custom User Agent (Optional)</Label>
                      <Textarea
                        id="customUserAgent"
                        placeholder="Leave empty for default user agent"
                        value={config.customUserAgent}
                        onChange={(e) => setConfig(prev => ({ ...prev, customUserAgent: e.target.value }))}
                        className="font-mono text-xs min-h-[60px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Preview & Build */}
              <div className="space-y-6">
                {/* Phone Preview */}
                <Card className="border-slate-200/80 shadow-sm sticky top-20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MonitorSmartphone className="w-5 h-5 text-slate-600" />
                      App Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Phone mockup */}
                    <div className="relative mx-auto w-[200px] h-[380px] rounded-[2rem] border-4 border-slate-800 bg-slate-800 overflow-hidden shadow-2xl">
                      {/* Status bar */}
                      <div className="h-7 bg-slate-800 flex items-center justify-between px-4">
                        <div className="flex gap-1">
                          <div className="w-1 h-1 rounded-full bg-white/50" />
                          <div className="w-1 h-1 rounded-full bg-white/50" />
                          <div className="w-1 h-1 rounded-full bg-white/50" />
                        </div>
                        <div className="w-12 h-1.5 rounded-full bg-white/20" />
                        <div className="flex gap-1">
                          <div className="w-2 h-1 rounded-sm bg-white/40" />
                          <div className="w-3 h-2 rounded-sm bg-white/40" />
                        </div>
                      </div>

                      {/* Splash screen preview */}
                      <div
                        className="h-[320px] flex flex-col items-center justify-center gap-3 transition-colors duration-300"
                        style={{ backgroundColor: config.backgroundColor }}
                      >
                        {iconPreview ? (
                          <div className="w-14 h-14 rounded-2xl shadow-lg overflow-hidden">
                            <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <ImageIcon className="w-7 h-7 text-white/70" />
                          </div>
                        )}
                        <p className="text-white font-semibold text-sm text-center px-4 truncate max-w-[180px]">
                          {config.splashText || config.appName || 'App Name'}
                        </p>
                        {config.splashDuration > 0 && (
                          <p className="text-white/60 text-[10px]">Splash: {config.splashDuration}ms</p>
                        )}
                      </div>

                      {/* Navigation bar */}
                      {config.enableNavbar && (
                        <div className="h-[25px] bg-white flex items-center justify-between px-3 border-t border-slate-200">
                          <ChevronRight className="w-3 h-3 text-slate-400 rotate-180" />
                          <div className="w-16 h-1 rounded-full bg-slate-300" />
                          <RefreshCw className="w-3 h-3 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Config Summary */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-sm font-semibold text-slate-700">Configuration Summary</h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>App Name</span>
                          <span className="font-medium text-slate-700 truncate ml-2 max-w-[120px]">{config.appName || '—'}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Package</span>
                          <span className="font-mono text-slate-700 truncate ml-2 max-w-[120px]">{config.packageName || '—'}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>URL</span>
                          <span className="font-mono text-slate-700 truncate ml-2 max-w-[120px]">{config.websiteUrl || '—'}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Orientation</span>
                          <span className="text-slate-700">{config.orientation}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Theme</span>
                          <span className="text-slate-700 capitalize">{config.themeMode}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Navbar</span>
                          <span className="text-slate-700">{config.enableNavbar ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Permissions</span>
                          <span className="text-slate-700">
                            {[
                              config.enablePullRefresh && 'Refresh',
                              config.enableFileAccess && 'Files',
                              config.enableCamera && 'Camera',
                              config.enableLocation && 'Location',
                              config.enableStorage && 'Storage',
                              config.enableNotifications && 'Notifications',
                            ].filter(Boolean).length || 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Build Button */}
                    <div className="space-y-3">
                      {isBuilding && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            <span className="text-sm text-slate-600">{buildStep}</span>
                          </div>
                          <Progress value={buildProgress} className="h-2" />
                        </div>
                      )}

                      <Button
                        onClick={handleBuild}
                        disabled={isBuilding}
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 transition-all duration-200"
                        size="lg"
                      >
                        {isBuilding ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Building APK...
                          </>
                        ) : (
                          <>
                            <Package className="w-5 h-5 mr-2" />
                            Build APK
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Build Result */}
                    {buildResult && (
                      <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-800">Build Successful!</span>
                        </div>
                        <p className="text-xs text-emerald-600">
                          Your APK is ready for download and has been optimized for Google Play Store.
                        </p>
                        <Button
                          onClick={() => handleDownload(buildResult.id, config.appName)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download APK
                        </Button>

                        {/* Installation Guide */}
                        <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100 space-y-2">
                          <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5" />
                            Installation Guide
                          </p>
                          <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal list-inside">
                            <li>Download the APK file on your Android phone</li>
                            <li>Open the downloaded APK file</li>
                            <li>If you see &quot;Install blocked&quot;, go to <b>Settings → Allow from this source</b> and enable it</li>
                            <li>Tap <b>Install</b> to install the app</li>
                            <li>If Google Play Protect shows a warning, tap <b>Install anyway</b> (More details → Install anyway)</li>
                          </ol>
                          <div className="pt-1.5 border-t border-blue-50">
                            <p className="text-[10px] text-blue-600 font-medium">
                              Tip: This APK is signed with a verified release key (v1+v2+v3) and follows Android security standards.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Security Info */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-slate-500 space-y-1">
                          <p className="font-medium text-slate-700">Play Protect Compatible</p>
                          <p>APK is signed with release keystore (v1+v2+v3), targets Android 14, and follows Google security standards.</p>
                          <p className="text-[10px] text-slate-400 mt-1">Note: &quot;Install unknown apps&quot; is an Android security feature that cannot be bypassed. It appears for all apps not installed from Play Store.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Build History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-slate-600" />
                  Build History
                </CardTitle>
                <CardDescription>All your previous APK builds</CardDescription>
              </CardHeader>
              <CardContent>
                {builds.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500">No builds yet</p>
                    <p className="text-sm text-slate-400">Create your first APK to see it here</p>
                    <Button variant="outline" onClick={() => setActiveTab('create')} className="mt-2">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Create APK
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {builds.map((build: any) => (
                        <div
                          key={build.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{build.appName}</p>
                              {build.status === 'completed' ? (
                                <Badge className="bg-emerald-50 text-emerald-700 text-xs">Completed</Badge>
                              ) : build.status === 'failed' ? (
                                <Badge variant="destructive" className="text-xs">Failed</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">{build.status}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono">{build.packageName}</p>
                            <p className="text-xs text-slate-400">{new Date(build.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {build.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(build.id, build.appName)}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(build.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/50 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-slate-400">
          <span>WebToAPK Builder v1.0</span>
          <span>Play Store Compatible | Secure APK Generation</span>
        </div>
      </footer>
    </div>
  )
}
