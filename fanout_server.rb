require 'eventmachine'
require 'em-websocket'


EventMachine.run do
  channel = EM::Channel.new
  
  EventMachine::WebSocket.start(:host => '0.0.0.0', :port => 8765) do |ws|
    ws.onopen do
      subscription_id = channel.subscribe do |sender_id, msg|
        unless sender_id == subscription_id
          ws.send(msg)
        end
      end

      ws.onmessage do |msg|
        channel.push([subscription_id, msg])
      end

      ws.onclose do
        channel.unsubscribe(subscription_id)
      end
    end
  end
end
