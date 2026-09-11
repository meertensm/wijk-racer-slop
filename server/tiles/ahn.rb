require 'net/http'
require 'tempfile'

class Ahn
  BASE = 'https://service.pdok.nl/rws/ahn/wcs/v1_0?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=dtm_05m&FORMAT=image/tiff' \
         '&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326'

  def heights((south, west, north, east), size)
    uri      = URI("#{BASE}&SUBSET=Lat(#{south},#{north})&SUBSET=Long(#{west},#{east})&SCALESIZE=Lat(#{size}),Long(#{size})")
    response = Net::HTTP.get_response(uri, 'User-Agent' => 'wijk-racer/0.2')
    raise "AHN #{response.code}" unless response.is_a?(Net::HTTPSuccess)
    grid(response.body)
  end

  private

  def grid(tiff)
    Tempfile.create(['ahn', '.tif']) do |image|
      image.binmode
      image.write(tiff)
      image.flush
      Tempfile.create(['ahn', '.csv']) do |csv|
        system('vips', 'csvsave', image.path, csv.path, '--separator', ',', exception: true)
        File.readlines(csv.path).map { |line| line.split(',').map { |value| value = value.to_f; value.abs < 1000 && !value.nan? ? value : nil } }
      end
    end
  end
end
