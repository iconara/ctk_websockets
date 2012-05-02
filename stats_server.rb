require 'bundler/setup'
require 'eventmachine'
require 'em-websocket'
require 'em-http'
require 'yajl'


EventMachine.run do
  stats_fanout_channel = EM::Channel.new
  
  EM.add_periodic_timer(1) do
    rq = EM::HttpRequest.new('http://guest:guest@stagingmqcoll101.byburt.com:55672/api/exchanges/%2f/fragments').get
    rq.errback { p :crap }
    rq.callback do
      stats = Yajl::Parser.parse(rq.response)
      publish_rate = stats['message_stats_in']['publish_details']['rate']
      msg = "#{(publish_rate * 10).round(1)} msg/s"
      stats_fanout_channel.push(msg)
      puts msg
    end
  end

  EventMachine::WebSocket.start(:host => '0.0.0.0', :port => 9876) do |ws|
    ws.onopen do
      subscription_id = stats_fanout_channel.subscribe do |msg|
        ws.send(msg)
      end

      ws.onclose do
        stats_fanout_channel.unsubscribe(subscription_id)
      end
    end
  end
end
